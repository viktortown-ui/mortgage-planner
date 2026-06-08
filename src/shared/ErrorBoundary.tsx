import { Component, type ReactNode } from 'react';
import { resetAppData } from './resetAppData';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(): void {
    // runtime safety fallback
  }

  private handleReset = async (): Promise<void> => {
    await resetAppData();
    window.location.reload();
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <div className="app"><main><section className="results"><div className="panel"><h3>Что-то сломалось при расчёте или загрузке данных.</h3><p>Можно сбросить данные этой страницы и перезагрузить приложение.</p><button type="button" onClick={() => void this.handleReset()}>Сбросить данные и перезагрузить</button></div></section></main></div>;
  }
}
