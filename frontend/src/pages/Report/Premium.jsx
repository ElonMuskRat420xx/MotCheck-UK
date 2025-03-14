import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  GovUKContainer, 
  GovUKMainWrapper,
  GovUKHeadingXL,
  GovUKHeadingL,
  GovUKBody,
  GovUKLink,
  GovUKSectionBreak,
  GovUKLoadingContainer,
  GovUKLoadingSpinner,
  PremiumBadge,
  ReportSection,
  VehicleRegistration
} from '../../styles/theme';
import Alert from '@mui/material/Alert';

// Import components 
import DVLAVehicleData from '../../components/Premium/DVLA/Header/DVLADataHeader';
import VehicleInsights from '../../components/Premium/DVLA/Insights/VehicleInsights';
import VehicleMileageChart from '../../components/Premium/DVLA/Mileage/Chart/MileageChart'; 
import VehicleMileageInsights from '../../components/Premium/DVLA/Mileage/MileageInsights/MileageInsights';

// Determine if we're in development or production
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

// Configure API URL based on environment
const API_BASE_URL = isDevelopment 
                    ? 'http://localhost:8000/api/v1'   // Development - direct to API port
                    : '/api/v1';                       // Production - use relative URL for Nginx proxy

const PremiumReportPage = () => {
  // Route handling
  const { registration } = useParams();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [motData, setMotData] = useState(null);
  
  useEffect(() => {
    // Check if payment information exists and fetch basic vehicle data
    const fetchVehicleData = async () => {
      try {
        // Validate payment ID presence
        if (!paymentId) {
          throw new Error('Invalid payment. Please purchase a premium report to access this page.');
        }
        
        if (!registration) {
          throw new Error('Vehicle registration is required.');
        }
        
        setLoading(true);
        setError(null);
        
        // Fetch vehicle data for the report
        const response = await fetch(
          `${API_BASE_URL}/vehicle/registration/${registration}?paymentId=${paymentId}`,
          {
            headers: {
              'Accept': 'application/json',
            },
            credentials: isDevelopment ? 'include' : 'same-origin',
            mode: isDevelopment ? 'cors' : 'same-origin'
          }
        );
        
        if (!response.ok) {
          let errorMessage = 'Failed to fetch vehicle data';
          try {
            const errorData = await response.json();
            errorMessage = errorData.errorMessage || errorData.detail || errorMessage;
          } catch (e) {
            // If parsing JSON fails, use default error message
          }
          throw new Error(errorMessage);
        }
        
        const vehicleData = await response.json();
        
        // Create report data
        setReportData({
          registration: registration,
          makeModel: `${vehicleData.make || 'Unknown'} ${vehicleData.model || ''}`.trim(),
          colour: vehicleData.primaryColour || vehicleData.colour || 'Unknown',
          vin: vehicleData.vin // Include VIN if needed by child components
        });
        
        // Transform MOT data for the mileage chart
        if (vehicleData.motTests && vehicleData.motTests.length > 0) {
          const transformedMotData = transformMotData(vehicleData);
          setMotData(transformedMotData);
        }
      } catch (err) {
        console.error('Error fetching vehicle data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVehicleData();
  }, [registration, paymentId]);
  
  // Transform the API response to match the expected motData format for the chart
  const transformMotData = (apiData) => {
    if (!apiData || !apiData.motTests || apiData.motTests.length === 0) return [];
    
    return apiData.motTests.map(test => {
      const testDate = new Date(test.completedDate);
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      const formattedDate = testDate.toLocaleDateString('en-GB', options);
      
      return {
        date: formattedDate,
        status: test.testResult === 'PASSED' ? 'PASS' : 'FAIL',
        mileage: test.odometerResultType === 'READ' 
          ? `${parseInt(test.odometerValue).toLocaleString('en-GB')} ${test.odometerUnit === 'MI' ? 'miles' : 'km'}`
          : 'Not recorded',
        testNumber: test.motTestNumber || 'Not available',
        expiry: test.expiryDate 
          ? new Date(test.expiryDate).toLocaleDateString('en-GB', options)
          : null
      };
    });
  };
  
  // Show loading state
  if (loading) {
    return (
      <GovUKContainer>
        <GovUKMainWrapper>
          <GovUKLoadingContainer>
            <GovUKLoadingSpinner />
            <GovUKBody>Generating your premium report...</GovUKBody>
          </GovUKLoadingContainer>
        </GovUKMainWrapper>
      </GovUKContainer>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <GovUKContainer>
        <GovUKMainWrapper>
          <Alert severity="error" style={{ marginBottom: '20px' }}>
            {error}
          </Alert>
          <GovUKBody>
            <GovUKLink href="/" noVisitedState>
              Return to homepage
            </GovUKLink>
          </GovUKBody>
        </GovUKMainWrapper>
      </GovUKContainer>
    );
  }
  
  // Show report when data is loaded
  if (reportData) {
    return (
      <GovUKContainer>
        <GovUKMainWrapper>
          <PremiumBadge>PREMIUM</PremiumBadge>
          
          <GovUKHeadingXL>
            Vehicle Report
          </GovUKHeadingXL>
          
          <VehicleRegistration data-test-id="premium-vehicle-registration">
            {reportData.registration}
          </VehicleRegistration>
          
          <GovUKHeadingL>
            {reportData.makeModel}
          </GovUKHeadingL>
          
          <GovUKSectionBreak className="govuk-section-break--visible govuk-section-break--m" />
          
          {/* Pass necessary props to components */}
          <DVLAVehicleData 
            registration={reportData.registration} 
            paymentId={paymentId} 
          />
          
          <GovUKSectionBreak className="govuk-section-break--visible govuk-section-break--m" />
          
          <ReportSection>
            <VehicleInsights 
              registration={reportData.registration} 
              vin={reportData.vin}
              paymentId={paymentId} 
            />
          </ReportSection>
          
          <GovUKSectionBreak className="govuk-section-break--visible govuk-section-break--m" />
          
          <ReportSection>
            {/* Pass the transformed MOT data directly to the chart component */}
            <VehicleMileageChart motData={motData} />
          </ReportSection>
          
          <GovUKSectionBreak className="govuk-section-break--visible govuk-section-break--m" />
          
          <ReportSection>
            <VehicleMileageInsights 
              registration={reportData.registration} 
              paymentId={paymentId} 
            />
          </ReportSection>
          
          <GovUKBody>
            <GovUKLink href={`/vehicle/${reportData.registration}`} noVisitedState>
              Return to basic vehicle details
            </GovUKLink>
          </GovUKBody>
        </GovUKMainWrapper>
      </GovUKContainer>
    );
  }
  
  // Fallback (should never reach here given the conditions above)
  return null;
};

export default PremiumReportPage;