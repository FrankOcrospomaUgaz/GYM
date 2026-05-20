import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export type ToastIcon = "success" | "error" | "warning" | "info";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  customClass: {
    popup: "gym-toast-popup",
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

export function showToast(title: string, icon: ToastIcon = "success") {
  void Toast.fire({ icon, title });
}
