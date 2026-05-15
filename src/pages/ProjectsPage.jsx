import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getDossiers } from '@/utils/localStorage.js';

const ProjectsPage = () => {
  const dossiers = getDossiers();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Projets</h1>
        <Link to="/simulateur" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Link>
      </div>
      {dossiers.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-white p-8 text-center shadow-elevation-sm">
          <h2 className="text-xl font-extrabold">Aucun projet ouvert</h2>
          <p className="mt-2 text-sm text-muted-foreground">Votre premier projet apparaîtra ici après la simulation ou l’inscription.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dossiers.map((dossier) => (
            <Link key={dossier.id} to={`/dossier/${dossier.id}`} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
              <h2 className="font-extrabold">{dossier.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{dossier.nextAction}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
