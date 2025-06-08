"use client"
import { LocalizeFunc } from "@/game/i18n";
import React from "react";
import { useEffect } from "react";

export default function Log({ t, logs, showLog, setShowLog }: {
  t: LocalizeFunc,
  logs: string[],
  showLog: boolean,
  setShowLog: (showLog: boolean) => void,
}) {
  const v = logs.join("\n");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  // scroll to bottom
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [v]);
  return (
    <div>
      <input type="checkbox" id="log" checked={showLog} onChange={(e) => {
        setShowLog(e.target.checked);
        setTimeout(() => {
          if (ref.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
          }
        })
      }} />
      <label htmlFor="log" style={{ cursor: "pointer" }}>{t("show-log")}</label>
      <textarea
        ref={ref}
        hidden={!showLog}
        value={v}
        readOnly
        style={{
          width: "calc(100vw - 100px)",
          height: "100px",
          resize: "none",
        }}
      ></textarea>
    </div >
  );
}
