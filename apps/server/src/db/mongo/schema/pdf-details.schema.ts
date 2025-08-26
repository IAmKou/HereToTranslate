import { Schema, model, Document } from 'mongoose';

export interface TextDetail {
  text: string;
  font: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  llx: number;   // lower-left x
  lly: number;   // lower-left y
  urx: number;   // upper-right x
  ury: number;   // upper-right y
  isUnderline?: boolean; // optional (if you detect annotations)
}

export interface PageDetails {
  pageNumber: number;
  details: TextDetail[];
}

export interface PdfTextDoc extends Document {
  fileName: string;
  uploadedAt: Date;
  pages: PageDetails[];
}

const TextDetailSchema = new Schema<TextDetail>(
  {
    text: { type: String, required: true },
    font: { type: String },
    fontSize: { type: Number },
    isBold: { type: Boolean, default: false },
    isItalic: { type: Boolean, default: false },
    color: { type: String },
    llx: { type: Number },
    lly: { type: Number },
    urx: { type: Number },
    ury: { type: Number },
    isUnderline: { type: Boolean, default: false },
  },
  { _id: false }
);

const PageDetailsSchema = new Schema<PageDetails>(
  {
    pageNumber: { type: Number, required: true },
    details: { type: [TextDetailSchema], default: [] },
  },
  { _id: false }
);

export const PdfTextSchema = new Schema<PdfTextDoc>({
  fileName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  pages: { type: [PageDetailsSchema], default: [] },
});

export const PdfTextModel = model<PdfTextDoc>('PdfTextDetails', PdfTextSchema);
