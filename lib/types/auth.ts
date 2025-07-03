export interface AuthDto {
  email: string;
  password: string;
}

export interface TokensResponseDto {
  accessToken: string;
  refreshToken: string;
}