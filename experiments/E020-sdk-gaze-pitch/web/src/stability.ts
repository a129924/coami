export function stabilityState(locked: boolean, checked: boolean): {disabled:boolean;checked:boolean} {
 return {disabled:locked,checked:locked?false:checked}
}
