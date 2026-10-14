function record(value: unknown): Record<string,unknown> {
 if(typeof value!=='object'||value===null||Array.isArray(value))throw Error('Invalid runtime provenance object')
 return value as Record<string,unknown>
}
// Locations are diagnostic only; never export them as authenticated tool identities.
export function stableRuntimeProvenance(value: Record<string,unknown>): Record<string,unknown> {
 const stable=record(JSON.parse(JSON.stringify(value)))
 const moddable=record(stable.moddable);delete moddable.path
 for(const tool of Object.values(record(moddable.tools)))delete record(tool).path
 const emscripten=record(stable.emscripten);delete emscripten.emsdkPath;delete emscripten.emccPath
 const config=record(emscripten.controlledConfig)
 for(const key of ['configPath','configSha256','paths','pythonBinary'])delete config[key]
 delete record(stable.fontbm).path
 return stable
}
export function canonicalJson(value: unknown): string {
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']'
 if(typeof value==='object'&&value!==null){const obj=record(value);return '{'+Object.keys(obj).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(obj[key])).join(',')+'}'}
 const serialized=JSON.stringify(value);if(serialized===undefined)throw Error('Invalid JSON value');return serialized
}
