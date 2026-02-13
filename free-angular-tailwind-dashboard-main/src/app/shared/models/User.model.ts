export interface User {
  id: string;           
  nom: string;
  prenom: string;
  phoneNumber: string;
  role: string;
  image?: string;
  email: string;
  birthDate?: Date | string;
  statut: 'Actif' | 'Inactif'; 

}
