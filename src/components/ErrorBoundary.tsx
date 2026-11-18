import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Terjadi Gangguan Koneksi atau Izin Data
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aplikasi mendeteksi kendala saat membaca atau menyimpan data ke database Firestore.
              Pastikan Anda masuk dengan akun Google yang terverifikasi dan muat ulang halaman.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-rose-700 break-all max-h-36 overflow-y-auto">
              {this.state.errorMessage}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-9 px-4 text-xs font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md"
              >
                Muat Ulang Aplikasi
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
