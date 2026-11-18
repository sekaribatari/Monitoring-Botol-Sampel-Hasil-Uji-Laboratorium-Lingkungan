export type SampleMatrix =
  | 'Air Limbah'
  | 'Air Bersih'
  | 'Air Permukaan'
  | 'Udara & Emisi'
  | 'Tanah & Sedimen'
  | 'Oli & Pelumas';

export type BottleStage =
  | 'Diterima Lab'
  | 'Preparasi'
  | 'Proses Uji'
  | 'Verifikasi QC'
  | 'Sertifikat Terbit';

export type SealCondition =
  | 'Segel Utuh'
  | 'Segel Pengaman Ganda'
  | 'Perlu Verifikasi Ulang';

export type ParameterStatus = 'Menunggu' | 'Sedang Diuji' | 'Selesai';

export type ComplianceResult =
  | 'Belum Dievaluasi'
  | 'Memenuhi'
  | 'Melebihi Baku Mutu';

export type PhotoCategory =
  | 'Segel & Botol'
  | 'Kondisi Penerimaan'
  | 'Preparasi & Uji';

export interface SamplePhoto {
  id: string;
  sampleId: string;
  ownerId: string;
  category: PhotoCategory;
  caption: string;
  fileName: string;
  dataUrl: string;
  uploadedBy: string;
  createdAt?: string;
}

export interface PendingPhotoUpload {
  id: string;
  category: PhotoCategory;
  caption: string;
  fileName: string;
  dataUrl: string;
  sizeKb: number;
}

export interface ParameterPreset {
  id: string;
  ownerId?: string;
  name: string;
  matrix: SampleMatrix;
  method: string;
  unit: string;
  limitText: string;
  limitMin?: number;
  limitMax?: number;
  recommendedContainer: string;
}

export interface TestParameter {
  id: string;
  name: string;
  method: string;
  unit: string;
  limitText: string;
  limitMin?: number;
  limitMax?: number;
  resultValue: string;
  status: ParameterStatus;
  compliance: ComplianceResult;
  analystName: string;
  testedAt?: string;
  notes?: string;
}

export interface CustodyLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: 'Tim Teknis Lapangan' | 'Penerima Sampel Lab' | 'Analis Lab' | 'Penyelia QC' | 'Manajer Teknis';
  action: string;
  note: string;
  stageAfter: BottleStage;
}

export interface CertificateData {
  certificateNumber: string;
  issuedAt: string;
  issuedBy: string;
  technicalManager: string;
  verificationHash: string;
  conclusion: string;
  accreditationRef: string;
}

export interface SampleBottle {
  id: string;
  ownerId?: string;
  sampleCode: string;
  sealNumber: string;
  workOrderNo: string;
  companyName: string;
  companyPic: string;
  samplingLocation: string;
  matrix: SampleMatrix;
  containerType: string;
  bottleCount: number;
  sealCondition: SealCondition;
  temperatureOnReceipt: number;
  fieldTechnician: string;
  labReceiver: string;
  sampledAt: string;
  receivedAt: string;
  dueDate: string;
  stage: BottleStage;
  rackLocation: string;
  notes: string;
  parameters: TestParameter[];
  custodyLogs: CustodyLogEntry[];
  certificate?: CertificateData;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'staff';
}

export type WorkspaceTab =
  | 'overview'
  | 'samples'
  | 'custody'
  | 'certificates'
  | 'catalog';
