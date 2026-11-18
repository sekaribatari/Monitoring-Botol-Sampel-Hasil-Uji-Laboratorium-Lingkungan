import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { INITIAL_SAMPLES } from '../data/presets';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  BottleStage,
  CertificateData,
  CustodyLogEntry,
  ParameterPreset,
  PendingPhotoUpload,
  SampleBottle,
  SamplePhoto,
  TestParameter,
} from '../types/sample';

function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return obj;
}

function formatTimestamp(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}

export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName || user.email || 'Petugas Lab').slice(0, 120);
    const email = (user.email || '').slice(0, 160);
    const photoURL = (user.photoURL || '').slice(0, 500);

    if (!snap.exists()) {
      await setDoc(
        ref,
        stripUndefined({
          uid: user.uid,
          displayName,
          email,
          ...(photoURL ? { photoURL } : {}),
          role: 'staff',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await updateDoc(
        ref,
        stripUndefined({
          displayName,
          email,
          ...(photoURL ? { photoURL } : {}),
          updatedAt: serverTimestamp(),
        })
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToSamples(
  uid: string,
  onData: (samples: SampleBottle[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'samples';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SampleBottle[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId || uid),
          sampleCode: String(data.sampleCode || ''),
          sealNumber: String(data.sealNumber || ''),
          workOrderNo: String(data.workOrderNo || ''),
          companyName: String(data.companyName || ''),
          companyPic: String(data.companyPic || ''),
          samplingLocation: String(data.samplingLocation || ''),
          matrix: data.matrix,
          containerType: String(data.containerType || ''),
          bottleCount: Number(data.bottleCount || 1),
          sealCondition: data.sealCondition,
          temperatureOnReceipt: Number(data.temperatureOnReceipt ?? 4.0),
          fieldTechnician: String(data.fieldTechnician || ''),
          labReceiver: String(data.labReceiver || ''),
          sampledAt: String(data.sampledAt || ''),
          receivedAt: String(data.receivedAt || ''),
          dueDate: String(data.dueDate || ''),
          stage: data.stage,
          rackLocation: String(data.rackLocation || ''),
          notes: String(data.notes || ''),
          parameters: Array.isArray(data.parameters) ? data.parameters : [],
          custodyLogs: Array.isArray(data.custodyLogs) ? data.custodyLogs : [],
          ...(data.certificate ? { certificate: data.certificate as CertificateData } : {}),
        };
      });
      items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToSamplePhotos(
  sampleId: string,
  uid: string,
  onData: (photos: SamplePhoto[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `samples/${sampleId}/photos`;
  const q = query(collection(db, 'samples', sampleId, 'photos'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SamplePhoto[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          sampleId: String(data.sampleId || sampleId),
          ownerId: String(data.ownerId || uid),
          category: data.category,
          caption: String(data.caption || ''),
          fileName: String(data.fileName || ''),
          dataUrl: String(data.dataUrl || ''),
          uploadedBy: String(data.uploadedBy || ''),
          createdAt: formatTimestamp(data.createdAt),
        };
      });
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToCustomParameters(
  uid: string,
  onData: (params: ParameterPreset[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'customParameters';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ParameterPreset[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: String(data.ownerId || uid),
          name: String(data.name || ''),
          matrix: data.matrix,
          method: String(data.method || ''),
          unit: String(data.unit || ''),
          limitText: String(data.limitText || ''),
          ...(typeof data.limitMax === 'number' ? { limitMax: data.limitMax } : {}),
          recommendedContainer: String(data.recommendedContainer || ''),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

function buildSampleWritePayload(sample: SampleBottle, uid: string) {
  return stripUndefined({
    id: sample.id.slice(0, 128),
    ownerId: uid,
    sampleCode: sample.sampleCode.slice(0, 40),
    sealNumber: sample.sealNumber.slice(0, 40),
    workOrderNo: sample.workOrderNo.slice(0, 60),
    companyName: sample.companyName.slice(0, 160),
    companyPic: sample.companyPic.slice(0, 120),
    samplingLocation: sample.samplingLocation.slice(0, 240),
    matrix: sample.matrix,
    containerType: sample.containerType.slice(0, 160),
    bottleCount: Math.max(1, Math.min(100, Math.round(sample.bottleCount))),
    sealCondition: sample.sealCondition,
    temperatureOnReceipt: Number(sample.temperatureOnReceipt) || 4.0,
    fieldTechnician: sample.fieldTechnician.slice(0, 120),
    labReceiver: sample.labReceiver.slice(0, 120),
    sampledAt: sample.sampledAt.slice(0, 40),
    receivedAt: sample.receivedAt.slice(0, 40),
    dueDate: sample.dueDate.slice(0, 20),
    stage: sample.stage,
    rackLocation: sample.rackLocation.slice(0, 80),
    notes: sample.notes.slice(0, 1000),
    parameters: sample.parameters.slice(0, 50),
    custodyLogs: sample.custodyLogs.slice(0, 100),
    ...(sample.certificate ? { certificate: sample.certificate } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createSampleWithPhotos(
  sample: SampleBottle,
  photos: PendingPhotoUpload[],
  uid: string,
  uploaderName: string
): Promise<void> {
  const path = `samples/${sample.id}`;
  try {
    const batch = writeBatch(db);
    const sampleRef = doc(db, 'samples', sample.id);
    batch.set(sampleRef, buildSampleWritePayload(sample, uid));

    for (const p of photos.slice(0, 8)) {
      const photoId = p.id.replace(/[^a-zA-Z0-9_-]/g, '');
      const photoRef = doc(db, 'samples', sample.id, 'photos', photoId);
      batch.set(
        photoRef,
        stripUndefined({
          id: photoId,
          sampleId: sample.id,
          ownerId: uid,
          category: p.category,
          caption: (p.caption || p.fileName).slice(0, 160),
          fileName: p.fileName.slice(0, 120),
          dataUrl: p.dataUrl,
          uploadedBy: uploaderName.slice(0, 120),
          createdAt: serverTimestamp(),
        })
      );
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSampleWorkflow(
  sampleId: string,
  payload: {
    stage: BottleStage;
    parameters: TestParameter[];
    custodyLogs: CustodyLogEntry[];
  }
): Promise<void> {
  const path = `samples/${sampleId}`;
  try {
    await updateDoc(
      doc(db, 'samples', sampleId),
      stripUndefined({
        stage: payload.stage,
        parameters: payload.parameters.slice(0, 50),
        custodyLogs: payload.custodyLogs.slice(0, 100),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function issueSampleCertificate(
  sampleId: string,
  payload: {
    certificate: CertificateData;
    custodyLogs: CustodyLogEntry[];
  }
): Promise<void> {
  const path = `samples/${sampleId}`;
  try {
    await updateDoc(
      doc(db, 'samples', sampleId),
      stripUndefined({
        stage: 'Sertifikat Terbit',
        certificate: payload.certificate,
        custodyLogs: payload.custodyLogs.slice(0, 100),
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSampleAndPhotos(sampleId: string, uid: string): Promise<void> {
  const path = `samples/${sampleId}`;
  try {
    const photosQuery = query(
      collection(db, 'samples', sampleId, 'photos'),
      where('ownerId', '==', uid)
    );
    const photosSnap = await getDocs(photosQuery);
    const batch = writeBatch(db);
    photosSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'samples', sampleId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function uploadSamplePhoto(
  sampleId: string,
  photo: PendingPhotoUpload,
  uid: string,
  uploaderName: string
): Promise<void> {
  const photoId = photo.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const path = `samples/${sampleId}/photos/${photoId}`;
  try {
    await setDoc(
      doc(db, 'samples', sampleId, 'photos', photoId),
      stripUndefined({
        id: photoId,
        sampleId,
        ownerId: uid,
        category: photo.category,
        caption: (photo.caption || photo.fileName).slice(0, 160),
        fileName: photo.fileName.slice(0, 120),
        dataUrl: photo.dataUrl,
        uploadedBy: uploaderName.slice(0, 120),
        createdAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSamplePhoto(sampleId: string, photoId: string): Promise<void> {
  const path = `samples/${sampleId}/photos/${photoId}`;
  try {
    await deleteDoc(doc(db, 'samples', sampleId, 'photos', photoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCustomParameter(
  param: ParameterPreset,
  uid: string
): Promise<void> {
  const paramId = param.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const path = `customParameters/${paramId}`;
  try {
    await setDoc(
      doc(db, 'customParameters', paramId),
      stripUndefined({
        id: paramId,
        ownerId: uid,
        name: param.name.slice(0, 120),
        matrix: param.matrix,
        method: param.method.slice(0, 120),
        unit: param.unit.slice(0, 40),
        limitText: param.limitText.slice(0, 60),
        ...(param.limitMax !== undefined ? { limitMax: param.limitMax } : {}),
        recommendedContainer: param.recommendedContainer.slice(0, 160),
        createdAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function seedInitialSamplesToFirestore(uid: string): Promise<void> {
  const path = 'samples';
  try {
    const batch = writeBatch(db);
    for (const s of INITIAL_SAMPLES) {
      const uniqueId = `${s.id}-${uid.slice(0, 6)}`.replace(/[^a-zA-Z0-9_-]/g, '');
      const ref = doc(db, 'samples', uniqueId);
      batch.set(
        ref,
        buildSampleWritePayload(
          {
            ...s,
            id: uniqueId,
          },
          uid
        )
      );
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
