import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3 } from 'lucide-react';

export const SignWellCallbackPage = () => {
  const [params] = useSearchParams();
  const provider = params.get('provider');
  const documentId = params.get('document_id') || params.get('documentId') || params.get('id');
  const status = params.get('status') || 'signed';
  const isSignwell = provider === 'signwell' || Boolean(documentId);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        {status === 'signed' || status === 'completed' ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        ) : (
          <Clock3 className="mx-auto h-12 w-12 text-sky-600" aria-hidden />
        )}
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          {status === 'signed' || status === 'completed'
            ? 'Signature enregistrée'
            : 'Retour de signature'}
        </h1>
        <p className="mt-3 text-slate-600">
          {isSignwell
            ? 'Merci. SignWell a bien reçu votre signature. Greffio mettra à jour votre dossier dans quelques instants.'
            : 'Merci. Votre action de signature a été prise en compte.'}
        </p>
        {documentId ? (
          <p className="mt-2 text-xs text-slate-400 break-all">
            Référence SignWell : {documentId}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/documents"
            className="inline-flex items-center justify-center rounded-full bg-[#1F6F78] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Voir mes documents
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
};
