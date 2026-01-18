/**
 * Core mathematical engine for hospital queue simulation.
 * This is a pure function that does not depend on databases or APIs.
 */
export const runSimulationLogic = ({ 
    arrival_rate, 
    service_time, 
    doctors, 
    total_beds, 
    emergency_patients, 
    normal_patients 
}) => {
    // 1. Queue Calculations
    const emergency_waiting_time = (emergency_patients * service_time) / (doctors * 2);
    const normal_waiting_time = ((normal_patients + emergency_patients) * service_time) / doctors;
    const total_queue_length = emergency_patients + normal_patients;

    // 2. Resource Utilization
    const doctor_utilization = (arrival_rate * service_time) / (doctors * 60) * 100;

    // 3. Bed Management Logic
    const occupied_beds = emergency_patients + normal_patients;
    const available_beds = total_beds - occupied_beds;
    const admission_delay = available_beds < 0 ? Math.abs(available_beds) * service_time : 0;

    // 4. Congestion Logic
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