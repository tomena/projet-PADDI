import { AuthModal } from "./ModalKit";

interface LoginModalProps {
  onClose: () => void;
  // userName : prénom de l'utilisateur ; token : jeton de session signé par le serveur
  onSuccess: (userName: string, token: string) => void;
}

/* Fenêtre de connexion pour la mise à jour des COÛTS.
   Toute la logique (serveur /api/auth, première connexion, changement de mot de passe,
   4 langues, thème sombre, responsive) est dans ModalKit.tsx : elle est partagée avec
   ActivitesAccessModal, pour qu'un même compte donne accès aux deux. */
export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  return <AuthModal purpose="costs" onClose={onClose} onSuccess={onSuccess} />;
}
