import { AuthModal } from "./ModalKit";

interface ZonesLoginModalProps {
  onClose: () => void;
  // userName : prénom de l'utilisateur ; token : jeton de session signé par le serveur
  onSuccess: (userName: string, token: string) => void;
}

/* Fenêtre de connexion pour la mise à jour des zones d'intervention.
   Même compte et même mot de passe que les coûts et les activités.
   L'accès réel est contrôlé côté serveur (liste ZONES_EDITEURS dans api/zones-intervention.ts). */
export default function ZonesLoginModal({ onClose, onSuccess }: ZonesLoginModalProps) {
  return <AuthModal purpose="zones" onClose={onClose} onSuccess={onSuccess} />;
}
