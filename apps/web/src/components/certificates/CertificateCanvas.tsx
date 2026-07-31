import { memo } from "react";
import type { CertificateCanvasProps } from "./types";
import CleanAchievers from "./templates/CleanAchievers";
import ModernKhmerExcellence from "./templates/ModernKhmerExcellence";
import HeritageHonors from "./templates/HeritageHonors";
import AngkorLaureates from "./templates/AngkorLaureates";

function CertificateCanvas(props: CertificateCanvasProps) {
  const { template, width, height } = props;

  const renderTemplate = () => {
    switch (template) {
      case "clean-achievers":
        return <CleanAchievers {...props} />;
      case "modern-khmer-excellence":
        return <ModernKhmerExcellence {...props} />;
      case "heritage-honors":
        return <HeritageHonors {...props} />;
      case "angkor-laureates":
        return <AngkorLaureates {...props} />;
      default:
        return <CleanAchievers {...props} />;
    }
  };

  return (
    <div
      style={{
        width,
        height,
        // The canvas uses standard web typography but scale is large due to high DPI
        // We set a base text size that feels normal in the preview scale
      }}
      className="relative overflow-hidden bg-white"
    >
      {renderTemplate()}
    </div>
  );
}

export default memo(CertificateCanvas);
