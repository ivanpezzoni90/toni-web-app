"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./GlobalHeader.module.scss";

export default function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  const isEditor = pathname.startsWith("/new") || pathname.startsWith("/edit");
  const hint = isEditor ? "Unsaved changes will be lost" : null;

  const handleBack = () => {
    if (isEditor) {
      const ok = window.confirm("Leave this page? Unsaved changes will be lost.");
      if (!ok) return;
    }
    router.push("/");
  };

  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        <div className={styles.brandWrap}>
          <div className={styles.logoWrap}>
            <img src="/toni-logo.svg" alt="Toni logo" />
          </div>
          <div className={styles.titleWrap}>
            <span className={styles.brand}>Toni</span>
            {hint ? <span className={styles.hint}>{hint}</span> : null}
          </div>
        </div>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          Back to recipes
        </button>
      </div>
    </div>
  );
}
