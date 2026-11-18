import React, { useState } from 'react';
import { Camera, FileCheck2, FlaskConical, ShieldCheck } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.';
      if (message.includes('popup-closed-by-user')) {
        setErrorMsg('Jendela login Google ditutup sebelum selesai. Silakan coba kembali.');
      } else {
        setErrorMsg('Gagal melakukan autentikasi Google: ' + message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-lg grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Kiri: Penjelasan Alur Operasional Lab */}
        <div className="lg:col-span-7 p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <div className="font-display text-lg font-bold tracking-tight text-slate-900">
              LabTrace
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight text-balance">
              Sistem Identifikasi Botol Sampel &amp; Penerbitan Sertifikat Hasil Uji
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pantau setiap botol sampel dari tim teknis lapangan dengan nomor segel unik,
              dokumentasi foto fisik botol, parameter uji spesifik klien, hingga sertifikat CoA
              yang terverifikasi di database.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <FlaskConical className="w-4 h-4 text-sky-800" />
                <span>Identifikasi Segel &amp; Barcode</span>
              </div>
              <p className="text-xs text-slate-500">
                Cegah sampel tertukar dengan validasi kode botol, nomor segel, dan label cetak.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Camera className="w-4 h-4 text-sky-800" />
                <span>Unggah Foto Bukti Fisik</span>
              </div>
              <p className="text-xs text-slate-500">
                Simpan foto botol, segel pengaman, dan kondisi penerimaan langsung ke database.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-sky-800" />
                <span>Monitoring &amp; Verifikasi QC</span>
              </div>
              <p className="text-xs text-slate-500">
                Pantau progres per parameter uji beserta evaluasi otomatis terhadap baku mutu.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <FileCheck2 className="w-4 h-4 text-sky-800" />
                <span>Sertifikat Hasil Uji Resmi</span>
              </div>
              <p className="text-xs text-slate-500">
                Terbitkan CoA dilengkapi kode QR verifikasi yang siap dicetak atau disimpan PDF.
              </p>
            </div>
          </div>
        </div>

        {/* Kanan: Aksi Masuk Google */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-slate-50/70 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Masuk ke Ruang Kerja Lab
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gunakan akun Google Anda untuk mengakses database botol sampel, unggah foto
              dokumentasi, dan menerbitkan sertifikat.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full h-11 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center justify-center gap-3 text-sm font-medium text-slate-900 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-sky-700"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{loading ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}</span>
          </button>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Seluruh catatan serah terima botol, unggahan foto fisik, dan sertifikat hasil uji
            tersimpan aman di database Firestore sesuai identitas akun Anda.
          </p>
        </div>
      </div>
    </div>
  );
};
