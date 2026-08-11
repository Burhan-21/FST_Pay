import { useEffect, useRef } from 'react';

interface GRecaptcha {
  render: (
    container: HTMLElement,
    parameters: {
      sitekey: string;
      callback: string | ((token: string) => void);
      'expired-callback'?: string | (() => void);
      theme?: 'dark' | 'light';
    }
  ) => number;
  reset?: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: GRecaptcha;
    onRecaptchaSuccess?: (token: string) => void;
    onRecaptchaExpired?: () => void;
  }
}

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
}

export default function ReCaptcha({ onVerify }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if script is already loaded
    let script = document.getElementById('recaptcha-script') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Define global callbacks
    window.onRecaptchaSuccess = (token: string) => {
      onVerify(token);
    };

    window.onRecaptchaExpired = () => {
      onVerify(null);
    };

    const renderRecaptcha = () => {
      if (window.grecaptcha && containerRef.current && widgetIdRef.current === null) {
        try {
          const isDark = document.documentElement.classList.contains('dark');
          const widgetId = window.grecaptcha.render(containerRef.current, {
            sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
            callback: 'onRecaptchaSuccess',
            'expired-callback': 'onRecaptchaExpired',
            theme: isDark ? 'dark' : 'light',
          });
          widgetIdRef.current = widgetId;
        } catch (e) {
          console.warn('reCAPTCHA render error:', e);
        }
      }
    };

    if (window.grecaptcha) {
      renderRecaptcha();
    } else {
      const originalOnload = script.onload;
      script.onload = (e) => {
        if (originalOnload) {
          originalOnload.call(script, e);
        }
        let checks = 0;
        const interval = setInterval(() => {
          if (window.grecaptcha) {
            clearInterval(interval);
            renderRecaptcha();
          } else if (checks > 50) {
            clearInterval(interval);
          }
          checks++;
        }, 100);
      };
    }

    return () => {
      // Clear global callbacks
      delete window.onRecaptchaSuccess;
      delete window.onRecaptchaExpired;
      widgetIdRef.current = null;
    };
  }, [onVerify]);

  return (
    <div className="flex justify-center my-3">
      <div ref={containerRef} />
    </div>
  );
}
