import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface Visitor {
  name: string;
  birthDate: string;
  company: string;
  phone: string;
  badgeType: string;
  receiptNo: string;
  accessZone: string;
  visitDate: string;
  purpose: string;
  remarks: string;
}

export interface Escort {
  name: string;
  company: string;
  phone: string;
  regularBadgeZone: string;
  remarks: string;
}

export interface Tool {
  name: string;
  quantity: number;
  unit: string;
  spec: string;
  note: string;
}

export interface EntryApplication {
  id?: string;
  applyDate: string;
  visitors: Visitor[];
  escorts: Escort[];
  tools: Tool[];
  status: 'pending' | 'approved' | 'rejected';
  applicantId: string;
  applicantEmail: string;
  createdAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  rejectedAt?: any;
  rejectedBy?: string;
  pdfUrl?: string;
  pdfUrls?: string[];
  stampedPdfUrls?: string[];
  storagePaths?: string[];
  signatureImage?: string;
  applicantName?: string;
}

export const applicationService = {
  async createApplication(app: Omit<EntryApplication, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, 'applications'), {
        ...app,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'applications');
    }
  },

  async approveApplication(appId: string, userId: string) {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: userId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `applications/${appId}`);
    }
  },

  async rejectApplication(appId: string, userId: string) {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: userId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `applications/${appId}`);
    }
  },

  async updateApplicationStatus(appId: string, status: 'pending' | 'approved' | 'rejected') {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `applications/${appId}`);
    }
  },

  async deleteApplication(appId: string) {
    try {
      console.log("Service: Deleting application doc:", appId);
      await deleteDoc(doc(db, 'applications', appId));
      console.log("Service: Delete successful");
    } catch (err) {
      console.error("Service: Delete error:", err);
      handleFirestoreError(err, OperationType.DELETE, `applications/${appId}`);
    }
  }
};
