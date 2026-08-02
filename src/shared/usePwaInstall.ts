import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as NavigatorWithStandalone).standalone);
}

function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode);
  const [isIos] = useState(isIosDevice);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const requestInstall = async (): Promise<string> => {
    if (installPrompt) {
      setInstallPrompt(null);
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      return choice.outcome === 'accepted'
        ? 'Установка запущена. Приложение появится на главном экране.'
        : 'Установка отменена. Её можно запустить позже из меню «Действия».';
    }

    if (isIos) {
      return 'В Safari нажмите «Поделиться», затем «На экран Домой». После первого запуска калькулятор будет работать без сети.';
    }

    return 'Откройте ссылку в Chrome, затем в меню ⋮ выберите «Установить приложение» или «Добавить на главный экран». Встроенный браузер Telegram может не показать этот пункт.';
  };

  return { canInstall: installPrompt !== null, isIos, isStandalone, requestInstall };
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
