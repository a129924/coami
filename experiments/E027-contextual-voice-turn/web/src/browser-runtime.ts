import { SimulatorEngine } from '../../../../vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs'
import { StrictAudioBridge, browserAudioPort } from './strict-audio-bridge.ts'
import { TurnSession, OperationBudget, type RequestToken } from './turn-session.ts'
import { TurnBridge, sha256, isObject, type Evidence, type Send } from './turn-bridge.ts'
type Mode = 'turn' | 'A' | 'B'
type Engine = { start(): Promise<void>; pushButton(button: 'a'|'b'|'c'): void; dispose(): void;
  audioOutBridge: {tone(options?: unknown): Promise<void>;close():void}; hostBridge: Record<string,unknown> }
export class BrowserRuntime {
  readonly session = new TurnSession(crypto.randomUUID())
  ready = false
  private engine: Engine | null = null
  private player: StrictAudioBridge | null = null
  private turn: TurnBridge | null = null
  private recorder: AbortController | null = null
  private readonly abort = new AbortController()
  private timer: ReturnType<typeof setTimeout> | undefined
  private locked = false
  private context: 'clear'|'ambiguous' = 'clear'
  private mode: Mode = 'A'
  private modBusy = false
  private operation: RequestToken | null = null
  private traceBuffer = ''
  constructor(private readonly evidence: Evidence, private readonly changed: (mode:Mode, token:RequestToken|null)=>void) {}
  async open(viewport: HTMLCanvasElement, screen: HTMLCanvasElement): Promise<void> {
    if (this.engine || this.player) throw Error('runtime already opened; reload to retry startup')
    const context = new AudioContext()
    this.player = new StrictAudioBridge(browserAudioPort(context), () => this.session.token(), event => {
      this.evidence({kind:'playback', ...event})
      this.session.playback(event.token,event.phase)
      this.changed(this.mode,event.token)
    })
    await this.player.unlock()
    const modBytes = await this.verifyRuntime()
    let installed=false, modReady=false
    const ready = () => {
      if (installed && modReady && !this.locked) {
        clearTimeout(this.timer); this.ready=true; this.changed(this.mode,null)
      }
    }
    const engine = new SimulatorEngine({viewport,screen,runtimeBaseUrl:new URL('/simulator/',location.href).href,
      modStorage:{async loadInstalledMod(){return {name:'coami-mod.xsa',bytes:modBytes,size:modBytes.length,storage:'memory'}},
        async clearInstalledMod(){}, async saveInstalledMod(next:{name:string;bytes:Uint8Array}){return {...next,size:next.bytes.length,storage:'memory' as const}}},
      onReady:({installationStatus}:{installationStatus:string}) => {
        if (!['installed','prepared'].includes(installationStatus)) {this.close();return}
        installed=true; ready()
      },
      onModStatus:(status:unknown) => this.evidence({kind:'mod-status',status}),
      onTrace:(message:string) => {
        this.traceBuffer += message
        const lines=this.traceBuffer.split('\n');this.traceBuffer=lines.pop() ?? ''
        for(const line of lines) {
          const index=line.indexOf('COAMI27|'); if(index<0) continue
          let v:unknown; try {v=JSON.parse(line.slice(index+8))}catch{continue}
          if(!isObject(v)) continue
          this.evidence({kind:'mod-trace',record:v})
          if(v.kind==='ready'){modReady=true;ready()}
          if(v.kind==='sdk') {
            const token={session_id:this.session.id,run_seq:Number(v.run_seq)}
            if(!this.operation||this.operation.run_seq!==token.run_seq)return
            this.modBusy=false;this.operation=null
            this.session.sdk(token,v.success===true)
            clearTimeout(this.timer)
            this.turn?.close(); this.recorder?.abort()
            this.changed(this.mode,token)
          }
        }
      },
      onError:(error:unknown) => {this.evidence({kind:'runtime-error',error:String(error)});this.close()},
    }) as unknown as Engine
    const startup=engine.audioOutBridge
    engine.audioOutBridge={tone:options=>startup.tone(options),close:()=>{this.player?.close();startup.close()}}
    engine.hostBridge.AudioOut={...engine.audioOutBridge,play:async(bytes:ArrayBuffer)=>{
      try {if(!this.turn)throw Error('no active reply');await this.turn.verifyPlayback(bytes);return await this.player!.play(bytes)}
      catch {return false}
    }}
    engine.hostBridge.AudioIn={record:async(ms:number)=>{
      const token=this.session.token(), turn=this.turn, signal=this.recorder?.signal
      if(!token||!turn||!signal||ms!==4000)throw Error('invalid record request')
      const recording=await record(signal)
      await turn.capture(token,recording.bytes,recording.mime,recording.filename)
      return recording.bytes
    },close:()=>this.recorder?.abort()}
    engine.hostBridge.VoiceTurn={
      exchange:(bytes:ArrayBuffer)=>{if(this.mode!=='turn'||!this.turn)throw Error('wrong operation');return this.turn.exchange(bytes,this.context)},
      checkTts:(phrase:'A'|'B')=>{if(phrase!==this.mode||!this.turn)throw Error('wrong phrase');return this.turn.checkTts(phrase)},
    }
    this.engine=engine
    this.timer=setTimeout(()=>this.close(),30_000)
    await engine.start()
  }
  dispatch(mode:Mode, context:'clear'|'ambiguous'):void {
    if(!this.ready||this.locked||this.modBusy||this.session.state==='unconfirmed'||this.session.state==='closed')throw Error('runtime unavailable or busy; reload if expired')
    new OperationBudget(localStorage).accept()
    const token=this.session.begin(context)
    this.mode=mode;this.context=context;this.modBusy=true;this.operation=token
    this.recorder=new AbortController()
    const send:Send=async(path,body,signal)=>{
      const response=await fetch(`/api${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal})
      if(!response.ok)throw Error(`Server HTTP ${response.status}; no retry`)
      return response.json() as Promise<unknown>
    }
    this.turn=new TurnBridge(this.session,send,this.evidence)
    this.timer=setTimeout(()=>{
      this.session.timeout(token)
      this.evidence({kind:'host-deadline',...token,state:this.session.state})
      this.turn?.close();this.recorder?.abort();this.player?.close();this.engine?.dispose()
      this.ready=false;this.locked=true;this.changed(this.mode,token)
    },40_000)
    this.evidence({kind:'operation',...token,mode,context})
    this.engine!.pushButton(mode==='turn'?'b':mode==='A'?'a':'c')
    this.changed(mode,token)
  }
  failNext():void{this.player?.failNext()}
  close():void {
    if(this.locked)return
    this.locked=true;this.ready=false;this.abort.abort();clearTimeout(this.timer)
    this.turn?.close();this.recorder?.abort();this.player?.close();this.engine?.dispose();this.session.close()
    this.changed(this.mode,null)
  }
  private async verifyRuntime():Promise<Uint8Array> {
    const p=await fetch('/runtime-provenance.json',{cache:'no-store',signal:this.abort.signal})
    if(!p.ok)throw Error('missing fresh runtime; run npm run prepare:poc')
    const v:unknown=await p.json()
    if(!isObject(v)||v.experiment!=='E027'||v.sourceCommit!=='b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322'
      ||!isObject(v.sha256)||!isObject(v.mod)||!isObject(v.patchHashes))throw Error('runtime provenance mismatch')
    const hashes:Record<string,unknown>={'/simulator/mc.js':v.sha256['mc.js'],'/simulator/mc.wasm':v.sha256['mc.wasm'],'/coami-mod.xsa':v.mod.sha256}
    let mod:Uint8Array|null=null
    for(const [path,expected] of Object.entries(hashes)){
      const response=await fetch(path,{cache:'no-store',signal:this.abort.signal})
      if(!response.ok)throw Error(`missing ${path}`)
      const bytes=await response.arrayBuffer(), hash=await sha256(bytes)
      if(hash!==expected)throw Error(`served hash mismatch ${path}`)
      this.evidence({kind:'served-asset',path,sha256:hash,bytes:bytes.byteLength})
      if(path==='/coami-mod.xsa')mod=new Uint8Array(bytes)
    }
    this.evidence({kind:'provenance',value:v})
    if(!mod)throw Error('missing MOD')
    return mod
  }
}
async function record(signal:AbortSignal):Promise<{bytes:ArrayBuffer;mime:string;filename:string}>{
  const formats=[['audio/webm;codecs=opus','webm'],['audio/webm','webm'],['audio/mp4','m4a'],['audio/wav','wav']] as const
  const format=formats.find(([mime])=>MediaRecorder.isTypeSupported(mime))
  if(!format)throw Error('unsupported recording format')
  const stream=await navigator.mediaDevices.getUserMedia({audio:true})
  try {
    if(signal.aborted)throw Error('cancelled recording')
    const recorder=new MediaRecorder(stream,{mimeType:format[0]})
    const bytes=await new Promise<ArrayBuffer>((resolve,reject)=>{
      const chunks:Blob[]=[]
      const stop=()=>{if(recorder.state!=='inactive')recorder.stop()}
      const cancel=()=>{stop();reject(Error('cancelled recording'))}
      const timer=setTimeout(stop,4000)
      const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel)}
      signal.addEventListener('abort',cancel,{once:true})
      recorder.ondataavailable=e=>chunks.push(e.data)
      recorder.onerror=()=>{cleanup();reject(Error('recording failed'))}
      recorder.onstop=()=>{cleanup();if(signal.aborted)reject(Error('cancelled recording'));else void new Blob(chunks).arrayBuffer().then(resolve,reject)}
      try{recorder.start()}catch(error){cleanup();reject(error)}
    })
    return {bytes,mime:format[0],filename:`speak.${format[1]}`}
  } finally {for(const track of stream.getTracks())track.stop()}
}
