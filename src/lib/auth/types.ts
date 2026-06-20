export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
  status: number;
}
