"use client"
import { getDefaultLanguage, localize, Stringifyable } from "@/game/i18n";
import HotSeatGame from "./game";
import { useEffect, useState } from "react";

export default function Page() {
  const localeReact = useState<string | null>(null);
  let locale = localeReact[0];
  const setLocale = localeReact[1];
  useEffect(() => {
    if (locale == null) {
      changeLocale(getDefaultLanguage(window));
    }
  });
  const changeLocale = (newLocale: string) => {
    setLocale(newLocale);
    locale = newLocale;

    window.localStorage.setItem("language", newLocale);
  };

  function t(kind: string,
    params: { [name: string]: Stringifyable } | null = null) {
    return localize(locale || "en-US", kind, params);
  }

  return <HotSeatGame width={10} height={10} t={t}></HotSeatGame>;
}
