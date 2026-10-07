const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      window.dispatchEvent(new Event("auth-change"));
    }
    throw new ApiError(data.message || "Something went wrong", response.status);
  }

  return data;
}

export async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      window.dispatchEvent(new Event("auth-change"));
    }
    throw new ApiError(
      (data as { message?: string }).message || "File upload failed",
      response.status
    );
  }

  return data as T;
}

export async function downloadAuthenticatedFile(
  fileUrlOrEndpoint: string,
  suggestedFilename?: string
): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const fullUrl = fileUrlOrEndpoint.startsWith("http")
    ? fileUrlOrEndpoint
    : `${API_BASE_URL}${fileUrlOrEndpoint.startsWith("/") ? "" : "/"}${fileUrlOrEndpoint}`;

  const response = await fetch(fullUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new ApiError("Failed to download file", response.status);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  if (suggestedFilename) {
    a.download = suggestedFilename;
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function openAuthenticatedFile(
  fileUrlOrEndpoint: string
): Promise<void> {
  // Open window synchronously to preserve user click gesture and prevent popup blockers
  let newWindow: Window | null = null;
  if (typeof window !== "undefined") {
    newWindow = window.open("about:blank", "_blank");
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const fullUrl = fileUrlOrEndpoint.startsWith("http")
    ? fileUrlOrEndpoint
    : `${API_BASE_URL}${fileUrlOrEndpoint.startsWith("/") ? "" : "/"}${fileUrlOrEndpoint}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
      throw new ApiError("Failed to open file", response.status);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    if (newWindow && !newWindow.closed) {
      newWindow.location.href = url;
    } else {
      window.open(url, "_blank");
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (newWindow && !newWindow.closed) {
      newWindow.close();
    }
    throw err;
  }
}
