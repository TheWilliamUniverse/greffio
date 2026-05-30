import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDossierById } from '@/api/dossiers.js';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return;
      try {
        const payload = await getDossierById(id);
        if (!mounted) return;
        setProject({
          id: payload?.dossier?.id,
          name: payload?.dossier?.companyName || payload?.dossier?.denomination || 'Projet',
          nextAction: 'Suivre le dossier depuis les étapes réelles du backend.',
        });
      } catch (_error) {
        if (!mounted) return;
        setProject(null);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dossiers" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Retour aux projets
      </Link>
      {project ? (
        <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
          <h1 className="text-2xl font-extrabold">{project.name}</h1>
          <p className="mt-2 text-muted-foreground">{project.nextAction}</p>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-white p-6 text-center shadow-elevation-sm">
          <h1 className="text-2xl font-extrabold">Projet introuvable</h1>
          <p className="mt-2 text-muted-foreground">Aucune donnée client ne correspond à ce projet.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
