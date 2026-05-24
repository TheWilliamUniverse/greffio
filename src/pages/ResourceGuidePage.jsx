import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { getGuideBySlug } from '@/config/resourceGuides.js';
import { getCatalogItemById } from '@/config/resourceServices.js';

export const ResourceGuidePage = () => {
  const { slug } = useParams();
  const match = getGuideBySlug(slug);

  if (!match) {
    return <Navigate to="/ressources" replace />;
  }

  const [guideId, guide] = match;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild size="sm">
            <Link to="/ressources">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ressources
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase text-primary">Guide Greffio</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{guide.title}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{guide.summary}</p>

        <div className="mt-10 space-y-8">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-extrabold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-3 text-sm leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        {guide.relatedServiceIds?.length > 0 && (
          <section className="mt-12 rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
            <h2 className="text-lg font-extrabold">Services associés</h2>
            <ul className="mt-4 space-y-3">
              {guide.relatedServiceIds.map((serviceId) => {
                const service = getCatalogItemById(serviceId);
                if (!service) return null;
                return (
                  <li key={serviceId} className="flex items-center justify-between gap-4 text-sm">
                    <span>
                      <span className="font-semibold">{service.title}</span>
                      <span className="mt-0.5 block text-muted-foreground">{service.description}</span>
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/ressources#documents-officiels`}>Commander</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/simulateur">
              Préparer une formalité
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/ressources">Tous les guides</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};
