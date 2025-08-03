export interface ICreateRequestDto {
    requesterId: string;
    projectId: string;
    title: string;
    description: string;
    dealAmount: number;
    deadline: Date;
}
export type IUpdateRequestDto = Partial<Omit<ICreateRequestDto, 'requesterId' | 'projectId'>>;
//# sourceMappingURL=request.dto.interface.d.ts.map