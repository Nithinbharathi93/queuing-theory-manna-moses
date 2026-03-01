export const runSimulationLogic = ({ 
    arrival_rate, 
    service_time, 
    doctors, 
    total_beds, 
    emergency_patients, 
    normal_patients 
}) => {
    const emergency_waiting_time = (emergency_patients * service_time) / (doctors * 2 || 1); 
    const normal_waiting_time = ((normal_patients + emergency_patients) * service_time) / (doctors || 1);
    const total_queue_length = emergency_patients + normal_patients;
    const doctor_utilization = (arrival_rate * service_time) / (doctors * 60 || 1) * 100;
    const occupied_beds = emergency_patients + normal_patients;
    const available_beds = total_beds - occupied_beds;
    const admission_delay = available_beds < 0 ? Math.abs(available_beds) * service_time : 0;
    
    let congestion = "Low";
    if (emergency_waiting_time >= 15) {
        congestion = "High";
    } else if (emergency_waiting_time >= 5 || normal_waiting_time >= 20) {
        congestion = "Medium";
    }

    return {
        emergencyWaitingTimeMin: Number(emergency_waiting_time.toFixed(2)),
        normalWaitingTimeMin: Number(normal_waiting_time.toFixed(2)),
        totalQueueLength: total_queue_length,
        doctorUtilizationPct: Number(doctor_utilization.toFixed(2)),
        availableBeds: available_beds,
        admissionDelayMin: admission_delay,
        congestionLevel: congestion
    };
};