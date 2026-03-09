type statusType = "idle"|"loading" | "Success" | "failed";

export const StatusBanner = ({ status }: any) => {
  if (!status) return null;

  // If status is 400 and message contains "Email not confirmed"
  if (status.status === 400) {
    const message =
      status.message && status.message.includes("Email not confirmed")
        ? "Please verify your email to continue."
        : status.message;

    return (
      <p className="text-red-600 text-center mb-5 bg-red-200 py-2 rounded-lg">
        {message}
      </p>
    );
  }

  return null;
};