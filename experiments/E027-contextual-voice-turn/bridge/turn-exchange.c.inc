/* Appended ONLY to a scratch copy of wasm/audio-bridge.c. */
static void e027_start(int mode, const uint8_t *bytes, int length)
{
    EM_ASM({
        const s = {status:0};
        s.data = new Uint8Array(0);
        stackchanRuntime.state.coamiTurn = s;
        const bridge = stackchanRuntime.host && stackchanRuntime.host.VoiceTurn;
        const mode = $0;
        const data = new Uint8Array($2);
        if ($2) data.set(HEAPU8.subarray($1, $1+$2));
        Promise.resolve().then(() => {
            if (!bridge) throw Error('E027 bridge unavailable');
            return mode < 0 ? bridge.exchange(data.buffer) : bridge.checkTts(mode === 0 ? 'A' : 'B');
        }).then(buffer => {
            if (!(buffer instanceof ArrayBuffer) || !buffer.byteLength) throw Error('empty E027 reply');
            s.data = new Uint8Array(buffer); s.status = 1;
        }).catch(() => {s.status = -1;});
    }, mode, bytes, length);
}
void xs_e027_exchange(xsMachine *the) {
    e027_start(-1, xsmcToArrayBuffer(xsArg(0)), xsmcGetArrayBufferLength(xsArg(0)));
}
void xs_e027_check(xsMachine *the) { e027_start(xsmcToInteger(xsArg(0)), NULL, 0); }
void xs_e027_status(xsMachine *the) {
    xsmcSetInteger(xsResult, EM_ASM_INT({ const s=stackchanRuntime.state.coamiTurn; return s?s.status:-1; }));
}
void xs_e027_buffer(xsMachine *the) {
    int length = EM_ASM_INT({const s=stackchanRuntime.state.coamiTurn; return s?s.data.byteLength:0;});
    if (length <= 0) {xsmcSetArrayBuffer(xsResult, NULL, 0);return;}
    uint8_t *data = malloc(length);
    if (!data) xsUnknownError("no memory");
    EM_ASM({HEAPU8.set(stackchanRuntime.state.coamiTurn.data, $0);}, data);
    xsmcSetArrayBuffer(xsResult, data, length); free(data);
    EM_ASM({stackchanRuntime.state.coamiTurn.data = new Uint8Array(0);});
}
