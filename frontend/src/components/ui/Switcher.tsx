import type { MouseEventHandler } from "react";

interface SwitcherProps {
    name: string;
    text: string;
    stateTracker: string;
    changeHandler: MouseEventHandler<HTMLButtonElement>;
}

export default function Switcher({ name, text, stateTracker, changeHandler }: SwitcherProps) {
    return <button className={`button ${stateTracker === name ? 'button--active' : ''}`}
    name={name} onClick={changeHandler}>{text}</button>
}
