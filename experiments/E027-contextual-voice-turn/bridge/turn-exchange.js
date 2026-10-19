// Appended only to scratch wasm/audio-bridge.js, whose Timer import is reused.
const e027Exchange = native('xs_e027_exchange');
const e027Check = native('xs_e027_check');
const e027Status = native('xs_e027_status');
const e027Buffer = native('xs_e027_buffer');
let e027Busy = false;
function e027Wait(start) {
  if (e027Busy) return Promise.reject(Error('E027 busy'));
  e027Busy = true;
  return new Promise((resolve, reject) => {
    let polls = 0;
    try { start(); } catch (e) {e027Busy=false;reject(e);return;}
    const poll = () => {
      const status = e027Status();
      if (status === 0 && ++polls < 800) {Timer.set(poll, 50);return;}
      e027Busy = false;
      if (status > 0) resolve(e027Buffer()); else reject(Error('E027 exchange failed or expired'));
    };
    poll();
  });
}
globalThis.__coamiVoiceTurnBridge = {
  exchange: bytes => e027Wait(() => e027Exchange(bytes)),
  checkTts: phrase => e027Wait(() => e027Check(phrase === 'A' ? 0 : 1)),
};
