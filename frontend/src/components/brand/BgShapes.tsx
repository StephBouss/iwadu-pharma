// Motif de la charte V1.0 : carrés arrondis en escalier, en arrière-plan
// seulement (« jamais sur le texte »). Purement décoratif : masqué aux
// lecteurs d'écran et transparent aux clics. Le parent doit être `relative`
// et placer son contenu après ce composant.

export function BgShapes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Grand carré menthe — escalier en haut à droite */}
      <div className="absolute -top-15 -right-20 size-65 rounded-[48px] bg-mint/22" />
      {/* Marche vert Iwadu */}
      <div className="absolute top-25 -right-7.5 size-45 rounded-[40px] bg-brand/15" />
      {/* Grand carré vert pâle — en bas à gauche */}
      <div className="absolute bottom-40 -left-25 size-75 rounded-[56px] bg-mint-soft/55" />
      {/* Petit accent menthe — en bas à droite */}
      <div className="absolute -right-10 bottom-20 size-35 rounded-[36px] bg-mint/18" />
    </div>
  );
}
