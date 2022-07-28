import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { $axios } from "../../api/axios";
import { IFile } from "../../models/IFile";
import IFolder from "../../models/IFolder";
import { getFolderChildren } from "../../utils/parseFoldersTree";

export interface StorageState {
  folders: IFolder[];
  sf_id: number;
  files: IFile[];

  foldersStatus: "success" | "loading" | "error";
  filesStatus: "success" | "loading" | "error";
}

const initialState: StorageState = {
  folders: [],
  sf_id: 0,
  files: [],
  foldersStatus: "loading",
  filesStatus: "loading",
};

export const fetchFolders = createAsyncThunk<IFolder[], number>(
  "user/fetchFolders",
  async (params) => {
    const user_id = params;
    const response = await $axios.get(`/folders/${user_id}`);

    return response.data.folders;
  }
);

export const fetchFiles = createAsyncThunk<IFile[], number>(
  "user/fetchFiles",
  async (params) => {
    const folder_id = params;
    const response = await $axios.get(`/folder/${folder_id}`);
    return response.data.files;
  }
);

export const fetchFile = createAsyncThunk<any, number>(
  "user/fetchFile",
  async (params) => {
    const id = params;
    const response = await $axios.get(`/file/${id}`, { responseType: "blob" });
    const resp = {
      data: URL.createObjectURL(response.data),
      file_id: id,
      type: response.data.type,
    };
    return resp;
  }
);

export const storageSlice = createSlice({
  name: "storage",
  initialState,
  reducers: {
    setSelectedFolder(state, action: PayloadAction<number>) {
      state.sf_id = action.payload;
    },
    setFiles(state, action: PayloadAction<IFile[]>) {
      state.files = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      fetchFolders.fulfilled,
      (state, action: PayloadAction<IFolder[]>) => {
        state.folders = getFolderChildren(action.payload, state.sf_id);
        state.foldersStatus = "success";
      }
    );

    builder.addCase(fetchFolders.pending, (state) => {
      state.folders = [];
      state.foldersStatus = "loading";
    });

    builder.addCase(fetchFolders.rejected, (state) => {
      state.folders = [];
      state.foldersStatus = "error";
    });

    builder.addCase(
      fetchFiles.fulfilled,
      (state, action: PayloadAction<IFile[]>) => {
        state.files = action.payload;
        state.filesStatus = "success";
      }
    );

    builder.addCase(fetchFiles.pending, (state) => {
      state.files = [];
      state.filesStatus = "loading";
    });

    builder.addCase(fetchFiles.rejected, (state) => {
      state.files = [];
      state.filesStatus = "error";
    });

    builder.addCase(
      fetchFile.fulfilled,
      (state, action: PayloadAction<any>) => {
        if (state.files.length === 0) return;

        const index = state.files.findIndex(
          (f) => f.id === action.payload.file_id
        );
        state.files[index].data = action.payload.data;
        state.files[index].type = action.payload.type;
      }
    );

    builder.addCase(fetchFile.pending, (state) => {});

    builder.addCase(fetchFile.rejected, (state) => {});
  },
});

export const { setSelectedFolder, setFiles } = storageSlice.actions;

export default storageSlice.reducer;
