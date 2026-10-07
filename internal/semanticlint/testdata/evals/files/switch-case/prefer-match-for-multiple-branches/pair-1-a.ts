type Shipment = {
  status: "scheduled" | "inTransit" | "delivered";
  trackingNumber: string;
};

export const deliveryMessage = (shipment: Shipment): string => {
  if (shipment.status === "scheduled") {
    return "Pickup is scheduled";
  } else if (shipment.status === "inTransit") {
    return `Tracking ${shipment.trackingNumber}`;
  } else {
    return "Delivered";
  }
};
