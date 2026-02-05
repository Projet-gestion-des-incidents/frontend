export interface User {
  id: string;           // correspond à Guid côté backend
  nom: string;
  prenom: string;
  phoneNumber: string;
  role: string;
  image?: string;
  email: string;
  //password: string;
  birthDate?: Date | string;
}
