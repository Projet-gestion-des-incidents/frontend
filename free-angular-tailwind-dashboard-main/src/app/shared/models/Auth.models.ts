export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  userName: string;
  email: string;
  password: string;
  nom: string;
  prenom: string;
  
  roleId: string;
  phoneNumber?: string; 
  birthDate?: string; 
}

export interface AuthResponseDTO {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userName: string;
  email?: string;
  role?: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  errors?: string[];
  resultCode? : number;
}
export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}