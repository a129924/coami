"""E025 synthetic experiment: bubus delivers events; Robot TaskGroups own work.

This is not a production framework or an agreed Robot protocol.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Annotated, Literal
from uuid import uuid4

from bubus import BaseEvent, EventBus  # pyright: ignore[reportMissingTypeStubs]
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

CLEANUP_SECONDS = 2.0
type Mode = Literal[
    "blocked",
    "quick",
    "cleanup_hold",
    "cleanup_timeout",
    "cleanup_error",
    "child_error",
    "subscriber_error",
]


class Work(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["work"]
    id: str = Field(min_length=1, max_length=64)
    mode: Mode = "blocked"
    child: bool = False


class Cancel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["cancel"]


class Ping(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["ping"]


INPUT: TypeAdapter[Work | Cancel | Ping] = TypeAdapter(
    Annotated[Work | Cancel | Ping, Field(discriminator="kind")]
)


class WorkEvent(BaseEvent[None]):
    robot: str
    generation: int
    session: int
    request: Work


class FixtureBarrier(BaseEvent[None]):
    """Nonbusiness test infrastructure, held before an old WorkEvent is queued."""


class Frame(BaseModel):
    kind: str
    id: str = ""
    detail: str = ""
    generation: int | None = None
    session: int | None = None


class Record(BaseModel):
    seq: int
    at: float
    action: str
    robot: str = ""
    work: str = ""
    role: str = ""
    generation: int = 0
    session: int = 0
    detail: str = ""


class Lab:
    """Harness gates/audit and this experiment's fixed event subscribers."""

    def __init__(self) -> None:
        self.records: list[Record] = []
        self.changed = asyncio.Event()
        self.gates: dict[str, asyncio.Event] = {}
        self.robots: dict[str, Robot] = {}
        self.bus = EventBus(name="E025_" + uuid4().hex, max_history_size=50)
        self.bus.on(WorkEvent, self.primary)
        self.bus.on(WorkEvent, self.subscriber)
        self.bus.on(FixtureBarrier, self.fixture_barrier)
        self.results_blocked = False
        self.session_number = 0

    def mark(
        self,
        action: str,
        robot: str = "",
        work: str = "",
        role: str = "",
        generation: int = 0,
        session: int = 0,
        detail: str = "",
    ) -> Record:
        row = Record(
            seq=len(self.records) + 1,
            at=time.monotonic(),
            action=action,
            robot=robot,
            work=work,
            role=role,
            generation=generation,
            session=session,
            detail=detail,
        )
        self.records.append(row)
        self.changed.set()
        self.changed = asyncio.Event()
        return row

    def gate(self, key: str) -> asyncio.Event:
        return self.gates.setdefault(key, asyncio.Event())

    async def release(self, key: str) -> None:
        self.gate(key).set()

    async def snapshot(self) -> list[Record]:
        return list(self.records)

    async def wait(
        self,
        action: str,
        robot: str = "",
        work: str = "",
        role: str = "",
        after: int = 0,
    ) -> Record:
        async with asyncio.timeout(4):
            while True:
                for row in self.records:
                    if (
                        row.seq > after
                        and row.action == action
                        and (not robot or row.robot == robot)
                        and (not work or row.work == work)
                        and (not role or row.role == role)
                    ):
                        return row
                await self.changed.wait()

    async def block_bus(self) -> None:
        self.bus.dispatch(FixtureBarrier())
        await self.wait("bus_blocked")

    async def fixture_barrier(self, event: FixtureBarrier) -> None:
        self.mark("bus_blocked")
        await self.gate("bus").wait()

    async def block_results(self) -> None:
        self.results_blocked = True

    def transfer(self, event: WorkEvent, role: str) -> None:
        scope = self.robots[event.robot].scope
        if (
            scope is None
            or not scope.valid
            or scope.number != event.generation
            or scope.session != event.session
        ):
            self.mark(
                "stale_event",
                event.robot,
                event.request.id,
                role,
                event.generation,
                event.session,
            )
            return
        # Validation and registration are atomic with respect to async cancellation.
        scope.spawn(scope.jobs[event.request.id], role)
        self.mark(
            "transferred",
            event.robot,
            event.request.id,
            role,
            event.generation,
            event.session,
        )

    async def primary(self, event: WorkEvent) -> None:
        self.transfer(event, "primary")

    async def subscriber(self, event: WorkEvent) -> None:
        self.transfer(event, "subscriber")

    async def close(self) -> None:
        for gate in self.gates.values():
            gate.set()
        for robot in self.robots.values():
            robot.begin_cancel()
        controls = [r.canceller for r in self.robots.values() if r.canceller]
        if controls:
            await asyncio.wait(controls, timeout=3)
        roots = [r.scope.root for r in self.robots.values() if r.scope]
        if roots:
            await asyncio.wait(roots, timeout=3)
        await self.bus.wait_until_idle(timeout=2)
        await self.bus.stop(timeout=2, clear=True)  # App teardown, never per Robot.
        await asyncio.sleep(0)
        remaining = sum(r.scope.unfinished for r in self.robots.values() if r.scope)
        self.mark("teardown", detail=str(remaining))
        assert remaining == 0, "business tasks leaked beyond experiment teardown"


@dataclass
class Job:
    request: Work
    pending: set[str] = field(default_factory=lambda: {"primary", "subscriber"})
    done: asyncio.Event = field(default_factory=asyncio.Event)


class Generation:
    def __init__(self, robot: Robot, number: int, session: int) -> None:
        self.robot = robot
        self.lab = robot.lab
        self.number = number
        self.session = session
        self.valid = True
        self.queue: asyncio.Queue[Work] = asyncio.Queue(maxsize=2)
        self.jobs: dict[str, Job] = {}
        self.ids: set[str] = set()
        self.tasks: set[asyncio.Task[None]] = set()
        self.cleanups: set[asyncio.Task[None]] = set()
        self.ready = asyncio.Event()
        self.group: asyncio.TaskGroup | None = None
        self.root = asyncio.create_task(self.run(), name=f"{robot.id}:{number}:scope")

    @property
    def unfinished(self) -> int:
        return sum(not t.done() for t in self.tasks | self.cleanups)

    def mark(
        self, action: str, work: str = "", role: str = "", detail: str = ""
    ) -> None:
        self.lab.mark(
            action, self.robot.id, work, role, self.number, self.session, detail
        )

    async def run(self) -> None:
        try:
            async with asyncio.TaskGroup() as group:
                self.group = group
                self.tasks.add(group.create_task(self.consume(), name="business-queue"))
                self.ready.set()
                await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass
        except ExceptionGroup as exc:
            self.robot.begin_cancel(f"scope:{exc!r}")
        finally:
            self.mark("scope_stopped", detail=str(self.unfinished))

    async def consume(self) -> None:
        while True:
            request = await self.queue.get()
            job = Job(request)
            self.jobs[request.id] = job
            self.lab.bus.dispatch(
                WorkEvent(
                    robot=self.robot.id,
                    generation=self.number,
                    session=self.session,
                    request=request,
                )
            )
            self.mark("bus_enqueued", request.id)
            # No await on the bubus Event or gather of business tasks: cancellation
            # must not escape this scope or double-cancel their cleanup.
            await job.done.wait()
            self.queue.task_done()

    def spawn(self, job: Job, role: str) -> None:
        assert self.group is not None
        if not self.valid:
            self.mark("stale_event", job.request.id, role)
            return
        job.pending.add(role)
        self.tasks.add(
            self.group.create_task(
                self.work(job, role), name=f"{job.request.id}:{role}"
            )
        )

    async def cleanup(self, job: Job, role: str) -> None:
        request = job.request
        self.mark("cleanup_started", request.id, role)
        if request.mode == "cleanup_hold":
            await self.lab.gate(f"cleanup:{self.robot.id}:{request.id}").wait()
        if request.mode == "cleanup_timeout" and role == "primary":
            await asyncio.Event().wait()  # Cooperative, deliberately unreleased.
        if request.mode == "cleanup_error" and role == "primary":
            raise ValueError("synthetic cleanup failure")
        self.mark("cleaned", request.id, role)

    async def finish_cleanup(self, job: Job, role: str) -> bool:
        task = asyncio.create_task(
            self.cleanup(job, role), name=f"cleanup:{job.request.id}:{role}"
        )
        self.cleanups.add(task)
        deadline = asyncio.get_running_loop().time() + CLEANUP_SECONDS
        try:
            while True:
                remaining = deadline - asyncio.get_running_loop().time()
                if remaining <= 0:
                    raise TimeoutError("cleanup budget exhausted")
                try:
                    await asyncio.wait_for(asyncio.shield(task), timeout=remaining)
                    return True
                except asyncio.CancelledError:
                    # Only registered cleanup is shielded, with a fixed deadline.
                    continue
        except Exception as exc:  # noqa: BLE001 -- bounded cleanup failure boundary
            self.mark("cleanup_failed", job.request.id, role, type(exc).__name__)
            self.robot.begin_cancel(f"cleanup:{type(exc).__name__}")
            return False
        finally:
            if not task.done():
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            self.cleanups.discard(task)

    async def work(self, job: Job, role: str) -> None:
        request = job.request
        completed = False
        clean = False
        self.mark("started", request.id, role)
        try:
            if role == "primary" and request.child:
                self.spawn(job, "child")
            if (
                request.mode == "child_error"
                and role == "child"
                or request.mode == "subscriber_error"
                and role == "subscriber"
            ):
                raise ValueError(f"synthetic {role} failure")
            if request.mode == "quick":
                await asyncio.sleep(0)
            else:
                await self.lab.gate(f"run:{self.robot.id}:{request.id}").wait()
            completed = True
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 -- Robot-owned business failure boundary
            self.mark("business_failed", request.id, role, type(exc).__name__)
            self.robot.begin_cancel(f"{role}:{type(exc).__name__}")
        finally:
            clean = await self.finish_cleanup(job, role)
            self.mark("ended", request.id, role)
            job.pending.discard(role)
            if not job.pending:
                job.done.set()
        if completed and clean and role == "primary":
            self.robot.emit(
                Frame(
                    kind="result",
                    id=request.id,
                    generation=self.number,
                    session=self.session,
                )
            )
            self.mark("result_queued", request.id)


class Connection:
    def __init__(self, robot: Robot, socket: WebSocket, number: int) -> None:
        self.robot = robot
        self.socket = socket
        self.number = number
        self.outbox: asyncio.Queue[Frame] = asyncio.Queue()
        self.writer = asyncio.create_task(self.write(), name=f"{robot.id}:writer")

    async def write(self) -> None:
        try:
            while True:
                frame = await self.outbox.get()
                if frame.kind == "result":
                    if self.robot.lab.results_blocked:
                        await self.robot.lab.gate("writer").wait()
                    scope = self.robot.scope
                    if (
                        scope is None
                        or not scope.valid
                        or scope.number != frame.generation
                        or scope.session != frame.session
                        or self.number != frame.session
                    ):
                        self.robot.lab.mark("stale_result", self.robot.id, frame.id)
                        continue
                # No await between the final gate and beginning this send.
                self.robot.lab.mark(
                    f"send_started_{frame.kind}",
                    self.robot.id,
                    frame.id,
                    session=self.number,
                    generation=frame.generation or 0,
                )
                await self.socket.send_json(frame.model_dump())
                self.robot.lab.mark(
                    f"sent_{frame.kind}",
                    self.robot.id,
                    frame.id,
                    session=self.number,
                    generation=frame.generation or 0,
                )
        except (WebSocketDisconnect, RuntimeError, OSError) as exc:
            self.robot.lab.mark(
                "writer_failed",
                self.robot.id,
                session=self.number,
                detail=f"{type(exc).__name__}: {exc}",
            )
            return


class Robot:
    def __init__(self, lab: Lab, robot_id: str) -> None:
        self.lab = lab
        self.id = robot_id
        self.state: Literal["idle", "running", "cancelling", "quarantined"] = "idle"
        self.scope: Generation | None = None
        self.connection: Connection | None = None
        self.counter = 0
        self.errors: list[str] = []
        self.canceller: asyncio.Task[None] | None = None

    def emit(self, frame: Frame) -> None:
        if self.connection is not None:
            self.connection.outbox.put_nowait(frame)

    async def submit(self, request: Work, session: int) -> None:
        reason = ""
        if self.state in {"cancelling", "quarantined"}:
            reason = self.state
        else:
            if self.scope is None:
                self.counter += 1
                self.scope = Generation(self, self.counter, session)
                await self.scope.ready.wait()
            scope = self.scope
            if request.id in scope.ids:
                reason = "duplicate"
            else:
                try:
                    scope.queue.put_nowait(request)
                except asyncio.QueueFull:
                    reason = "full"
                else:
                    scope.ids.add(request.id)
                    self.state = "running"
                    scope.mark("accepted", request.id)
                    self.emit(Frame(kind="accepted", id=request.id))
                    return
        self.lab.mark("rejected", self.id, request.id, detail=reason)
        self.emit(Frame(kind="rejected", id=request.id, detail=reason))

    def begin_cancel(self, failure: str = "") -> None:
        if failure:
            self.errors.append(failure)
        if self.canceller is not None and not self.canceller.done():
            self.lab.mark("cancel_merged", self.id)
            return
        if self.state == "quarantined":
            return
        scope = self.scope
        self.state = "cancelling"
        # The entire transition, including invalidation, has no await.
        if scope is not None:
            scope.valid = False
            while not scope.queue.empty():
                queued = scope.queue.get_nowait()
                scope.mark("discarded", queued.id)
                scope.queue.task_done()
        self.lab.mark(
            "cancel_started", self.id, generation=scope.number if scope else 0
        )
        if scope is not None:
            scope.root.cancel()
        self.canceller = asyncio.create_task(
            self.finish_cancel(scope), name=f"{self.id}:control-cancel"
        )

    async def finish_cancel(self, scope: Generation | None) -> None:
        if scope is not None:
            done, _ = await asyncio.wait({scope.root}, timeout=CLEANUP_SECONDS)
            if not done or scope.unfinished:
                self.errors.append("barrier_timeout_or_unfinished")
        if self.errors:
            self.state = "quarantined"
            self.lab.mark("cancel_failed", self.id, detail=";".join(self.errors))
            self.emit(Frame(kind="cancel_failed", detail="quarantined"))
        else:
            self.scope = None
            self.state = "idle"
            self.lab.mark("cancel_complete", self.id, detail="0")
            self.emit(Frame(kind="cancel_complete"))


def create_app(lab: Lab | None = None) -> FastAPI:
    experiment = lab if lab is not None else Lab()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        yield
        await experiment.close()

    app = FastAPI(lifespan=lifespan)
    app.state.lab = experiment

    @app.websocket("/ws/{robot_id}")
    async def websocket(socket: WebSocket, robot_id: str) -> None:
        await socket.accept()
        robot = experiment.robots.setdefault(robot_id, Robot(experiment, robot_id))
        if robot.connection is not None:
            await socket.close(code=1008, reason="Robot already connected")
            return
        experiment.session_number += 1
        connection = Connection(robot, socket, experiment.session_number)
        robot.connection = connection
        experiment.mark(
            "connected",
            robot_id,
            session=connection.number,
            detail=str(id(asyncio.get_running_loop())),
        )
        try:
            while True:
                try:
                    message = INPUT.validate_json(await socket.receive_text())
                except ValidationError:
                    experiment.mark("invalid", robot_id)
                    robot.emit(Frame(kind="invalid"))
                    continue
                if isinstance(message, Cancel):
                    robot.begin_cancel()  # Bypass bubus and business queue.
                elif isinstance(message, Ping):
                    robot.emit(Frame(kind="pong"))
                else:
                    await robot.submit(message, connection.number)
        except WebSocketDisconnect:
            pass
        finally:
            robot.connection = None
            robot.begin_cancel()
            connection.writer.cancel()
            await asyncio.gather(connection.writer, return_exceptions=True)
            experiment.mark("disconnected", robot_id, session=connection.number)

    return app
