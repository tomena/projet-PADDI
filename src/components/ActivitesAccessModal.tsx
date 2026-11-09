import { AuthModal } from "./ModalKit";

interface ActivitesAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  // userName : prénom de l'utilisateur ; token : jeton de session signé par le serveur
  onSuccess: (userName: string, token: string) => void;
}

/* Fenêtre de connexion pour la mise à jour des ACTIVITÉS.
   Elle utilise exactement la même authentification serveur (/api/auth) que LoginModal :
   plus aucun mot de passe n'est écrit dans le code de la page. */
export default function ActivitesAccessModal({ isOpen, onClose, onSuccess }: ActivitesAccessModalProps) {
  if (!isOpen) return null;
  return <AuthModal purpose="activities" onClose={onClose} onSuccess={onSuccess} />;
}
