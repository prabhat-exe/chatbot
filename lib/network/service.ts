import { apiUrl } from "./api";
import api from "./axios";

export const getChat = (message: string) => {
  return api.post(apiUrl.chat, {
    message,
  });
};


