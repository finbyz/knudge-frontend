import { ApiClient } from "@/lib/api-client";

export interface KnowledgeDocument {
  id: string;
  filename: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  status: string;
  error_message?: string;
  chunk_count: number;
  product_name?: string;
  website_url?: string;
  created_at: string;
}

export interface DocumentListResponse {
  documents: KnowledgeDocument[];
  total: number;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  content: string;
  score: number;
  chunk_index: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export const knowledgeApi = {
  /**
   * Upload a document to the knowledge base
   */
  uploadDocument: async (
    file: File,
    productName?: string,
    websiteUrl?: string
  ): Promise<KnowledgeDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    if (productName) formData.append("product_name", productName);
    if (websiteUrl) formData.append("website_url", websiteUrl);

    return ApiClient.postForm("/knowledge/upload", formData);
  },

  /**
   * Get list of all user's knowledge documents
   */
  getDocuments: async (): Promise<DocumentListResponse> => {
    return ApiClient.get("/knowledge/documents");
  },

  /**
   * Get processing status of a document
   */
  getDocumentStatus: async (
    documentId: string
  ): Promise<{
    id: string;
    status: string;
    error_message?: string;
    chunk_count: number;
  }> => {
    return ApiClient.get(`/knowledge/documents/${documentId}/status`);
  },

  /**
   * Delete a knowledge document
   */
  deleteDocument: async (
    documentId: string
  ): Promise<{ status: string; message: string }> => {
    return ApiClient.delete(`/knowledge/documents/${documentId}`);
  },

  /**
   * Search knowledge base for relevant content
   */
  searchKnowledge: async (
    query: string,
    topK: number = 5
  ): Promise<SearchResponse> => {
    return ApiClient.post("/knowledge/search", { query, top_k: topK });
  },
};
