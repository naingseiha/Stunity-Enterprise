"use client";

interface StudentPhotoProps {
  student: {
    firstName: string;
    lastName: string;
    profileImage?: string;
    photoUrl?: string;
  };
  size?: "sm" | "md" | "lg";
}

export default function StudentPhoto({
  student,
  size = "md",
}: StudentPhotoProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-xs",
    md: "w-14 h-14 text-sm",
    lg: "w-20 h-20 text-base",
  };

  const getStudentInitials = (student: any) => {
    const firstInitial = student.firstName?.charAt(0) || "";
    const lastInitial = student.lastName?.charAt(0) || "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const photoUrl = student.profileImage || student.photoUrl;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${student.firstName} ${student.lastName}`}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span style={{ fontFamily: "Khmer OS Muol Light" }}>
          {getStudentInitials(student)}
        </span>
      )}
    </div>
  );
}
