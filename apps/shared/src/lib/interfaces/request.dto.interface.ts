export interface ICreateRequestDto {
  requesterId: string;
  projectId: string;
  title: string;
  description: string;
  dealAmount: number;
  deadline: Date;
  tags?: string[];
}

export type IUpdateRequestDto = Partial<
  Omit<ICreateRequestDto, 'requesterId' | 'projectId'>>;
