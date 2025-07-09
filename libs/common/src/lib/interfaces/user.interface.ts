export interface IUserAuth {
  id: bigint;
  username: string;
  role?: {
    id: number;
    name: string;
  };
}
