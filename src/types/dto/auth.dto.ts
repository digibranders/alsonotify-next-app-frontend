import { UserDto } from "./user.dto";

export interface LoginResponseDTO {
  token: string;
  user: UserDto;
}

export interface RegisterCompleteResponseDTO {
  token: string;
  user: UserDto;
}

export interface VerifyTokenResponseDTO {
  id: number;
  email: string;
  name: string | null;
}

export interface GenericSuccessDTO {
  success: boolean;
  message?: string;
}
