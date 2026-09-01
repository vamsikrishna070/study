import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import College from '../models/College.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ALL_28_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

const ALL_8_UTS = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

const INSTITUTIONS = [

  { name: 'SRM University-AP', shortName: 'SRM-AP', type: 'University', state: 'Andhra Pradesh', city: 'Amaravati', district: 'Guntur', website: 'https://srmap.edu.in' },
  { name: 'K L University (Koneru Lakshmaiah Education Foundation)', shortName: 'KLU', type: 'Deemed University', state: 'Andhra Pradesh', city: 'Vaddeswaram', district: 'Guntur', website: 'https://kluniversity.in' },
  { name: 'Andhra University', shortName: 'AU', type: 'University', state: 'Andhra Pradesh', city: 'Visakhapatnam', district: 'Visakhapatnam', website: 'https://andhrauniversity.edu.in' },
  { name: 'GITAM (Gandhi Institute of Technology and Management)', shortName: 'GITAM', type: 'Deemed University', state: 'Andhra Pradesh', city: 'Visakhapatnam', district: 'Visakhapatnam', website: 'https://gitam.edu' },
  { name: 'Indian Institute of Technology Tirupati', shortName: 'IIT Tirupati', type: 'Institute of National Importance', state: 'Andhra Pradesh', city: 'Tirupati', district: 'Tirupati', website: 'https://iittp.ac.in' },
  { name: 'National Institute of Technology Andhra Pradesh', shortName: 'NIT AP', type: 'Institute of National Importance', state: 'Andhra Pradesh', city: 'Tadepalligudem', district: 'West Godavari', website: 'https://nitandhra.ac.in' },
  { name: 'Indian Institute of Information Technology Sri City', shortName: 'IIIT Sri City', type: 'Institute of National Importance', state: 'Andhra Pradesh', city: 'Sri City', district: 'Tirupati', website: 'https://iiits.ac.in' },
  { name: 'Jawaharlal Nehru Technological University Kakinada', shortName: 'JNTUK', type: 'University', state: 'Andhra Pradesh', city: 'Kakinada', district: 'Kakinada', website: 'https://jntuk.edu.in' },
  { name: 'Jawaharlal Nehru Technological University Anantapur', shortName: 'JNTUA', type: 'University', state: 'Andhra Pradesh', city: 'Ananthapuramu', district: 'Ananthapuramu', website: 'https://jntua.ac.in' },
  { name: 'Sri Venkateswara University', shortName: 'SVU', type: 'University', state: 'Andhra Pradesh', city: 'Tirupati', district: 'Tirupati', website: 'https://svuniversity.edu.in' },
  { name: 'Vellore Institute of Technology AP', shortName: 'VIT-AP', type: 'University', state: 'Andhra Pradesh', city: 'Amaravati', district: 'Guntur', website: 'https://vitap.ac.in' },
  { name: 'Vignan\'s Foundation for Science, Technology & Research', shortName: 'VFSTR', type: 'Deemed University', state: 'Andhra Pradesh', city: 'Vadlamudi', district: 'Guntur', website: 'https://vignan.ac.in' },
  { name: 'Gayatri Vidya Parishad College of Engineering', shortName: 'GVPCE', type: 'Autonomous College', state: 'Andhra Pradesh', city: 'Visakhapatnam', district: 'Visakhapatnam', website: 'https://gvpce.ac.in' },
  { name: 'Velagapudi Ramakrishna Siddhartha Engineering College', shortName: 'VRSEC', type: 'Autonomous College', state: 'Andhra Pradesh', city: 'Vijayawada', district: 'NTR', website: 'https://vrsiddhartha.ac.in' },
  { name: 'Acharya Nagarjuna University', shortName: 'ANU', type: 'University', state: 'Andhra Pradesh', city: 'Nagarjuna Nagar', district: 'Guntur', website: 'https://nagarjunauniversity.ac.in' },

  { name: 'Indian Institute of Technology Hyderabad', shortName: 'IITH', type: 'Institute of National Importance', state: 'Telangana', city: 'Kandi', district: 'Sangareddy', website: 'https://iith.ac.in' },
  { name: 'International Institute of Information Technology Hyderabad', shortName: 'IIIT Hyderabad', type: 'Deemed University', state: 'Telangana', city: 'Hyderabad', district: 'Hyderabad', website: 'https://iiit.ac.in' },
  { name: 'University of Hyderabad', shortName: 'UoH', type: 'University', state: 'Telangana', city: 'Hyderabad', district: 'Rangareddy', website: 'https://uohyd.ac.in' },
  { name: 'Osmania University', shortName: 'OU', type: 'University', state: 'Telangana', city: 'Hyderabad', district: 'Hyderabad', website: 'https://osmania.ac.in' },
  { name: 'National Institute of Technology Warangal', shortName: 'NIT Warangal', type: 'Institute of National Importance', state: 'Telangana', city: 'Warangal', district: 'Hanamkonda', website: 'https://nitw.ac.in' },
  { name: 'Birla Institute of Technology and Science Pilani - Hyderabad Campus', shortName: 'BITS Hyderabad', type: 'Deemed University', state: 'Telangana', city: 'Hyderabad', district: 'Medchal-Malkajgiri', website: 'https://bits-pilani.ac.in/hyderabad' },
  { name: 'Jawaharlal Nehru Technological University Hyderabad', shortName: 'JNTUH', type: 'University', state: 'Telangana', city: 'Hyderabad', district: 'Hyderabad', website: 'https://jntuh.ac.in' },
  { name: 'Chaitanya Bharathi Institute of Technology', shortName: 'CBIT', type: 'Autonomous College', state: 'Telangana', city: 'Hyderabad', district: 'Rangareddy', website: 'https://cbit.ac.in' },
  { name: 'Vasavi College of Engineering', shortName: 'VCE', type: 'Autonomous College', state: 'Telangana', city: 'Hyderabad', district: 'Hyderabad', website: 'https://vce.ac.in' },
  { name: 'VNR Vignana Jyothi Institute of Engineering and Technology', shortName: 'VNR VJIET', type: 'Autonomous College', state: 'Telangana', city: 'Hyderabad', district: 'Medchal', website: 'https://vnrvjiet.ac.in' },
  { name: 'Kakatiya University', shortName: 'KU', type: 'University', state: 'Telangana', city: 'Warangal', district: 'Hanamkonda', website: 'https://kakatiya.ac.in' },
  { name: 'Mahindra University', shortName: 'MU', type: 'University', state: 'Telangana', city: 'Hyderabad', district: 'Medchal', website: 'https://mahindrauniversity.edu.in' },
  { name: 'Gokaraju Rangaraju Institute of Engineering and Technology', shortName: 'GRIET', type: 'Autonomous College', state: 'Telangana', city: 'Hyderabad', district: 'Medchal', website: 'https://griet.ac.in' },

  { name: 'Indian Institute of Science Bangalore', shortName: 'IISc', type: 'Institute of National Importance', state: 'Karnataka', city: 'Bengaluru', district: 'Bengaluru Urban', website: 'https://iisc.ac.in' },
  { name: 'National Institute of Technology Karnataka Surathkal', shortName: 'NITK', type: 'Institute of National Importance', state: 'Karnataka', city: 'Surathkal', district: 'Dakshina Kannada', website: 'https://nitk.ac.in' },
  { name: 'Indian Institute of Information Technology Bangalore', shortName: 'IIIT Bangalore', type: 'Deemed University', state: 'Karnataka', city: 'Bengaluru', district: 'Bengaluru Urban', website: 'https://iiitb.ac.in' },
  { name: 'Indian Institute of Technology Dharwad', shortName: 'IIT Dharwad', type: 'Institute of National Importance', state: 'Karnataka', city: 'Dharwad', district: 'Dharwad', website: 'https://iitdh.ac.in' },
  { name: 'R.V. College of Engineering', shortName: 'RVCE', type: 'Autonomous College', state: 'Karnataka', city: 'Bengaluru', district: 'Bengaluru Urban', website: 'https://rvce.edu.in' },
  { name: 'BMS College of Engineering', shortName: 'BMSCE', type: 'Autonomous College', state: 'Karnataka', city: 'Bengaluru', district: 'Bengaluru Urban', website: 'https://bmsce.ac.in' },
  { name: 'Ramaiah Institute of Technology', shortName: 'MSRIT', type: 'Autonomous College', state: 'Karnataka', city: 'Bengaluru', district: 'Bengaluru Urban', website: 'https://msrit.edu' },
  { name: 'PES University', shortName: 'PESU', type: 'University', state: 'Karnataka', city: 'Bengaluru', district: 'Bengaluru Urban', website: 'https://pes.edu' },
  { name: 'Manipal Academy of Higher Education', shortName: 'MAHE', type: 'Deemed University', state: 'Karnataka', city: 'Manipal', district: 'Udupi', website: 'https://manipal.edu' },
  { name: 'Visvesvaraya Technological University', shortName: 'VTU', type: 'University', state: 'Karnataka', city: 'Belagavi', district: 'Belagavi', website: 'https://vtu.ac.in' },
  { name: 'University of Mysore', shortName: 'UoM', type: 'University', state: 'Karnataka', city: 'Mysuru', district: 'Mysuru', website: 'https://uni-mysore.ac.in' },
  { name: 'National Institute of Mental Health and Neurosciences', shortName: 'NIMHANS', type: 'Institute of National Importance', state: 'Karnataka', city: 'Bengaluru', district: 'Bengaluru Urban', website: 'https://nimhans.ac.in' },

  { name: 'Indian Institute of Technology Madras', shortName: 'IIT Madras', type: 'Institute of National Importance', state: 'Tamil Nadu', city: 'Chennai', district: 'Chennai', website: 'https://iitm.ac.in' },
  { name: 'National Institute of Technology Tiruchirappalli', shortName: 'NIT Trichy', type: 'Institute of National Importance', state: 'Tamil Nadu', city: 'Tiruchirappalli', district: 'Tiruchirappalli', website: 'https://nitt.edu' },
  { name: 'Anna University', shortName: 'Anna University', type: 'University', state: 'Tamil Nadu', city: 'Chennai', district: 'Chennai', website: 'https://annauniv.edu' },
  { name: 'Vellore Institute of Technology', shortName: 'VIT Vellore', type: 'Deemed University', state: 'Tamil Nadu', city: 'Vellore', district: 'Vellore', website: 'https://vit.ac.in' },
  { name: 'SRM Institute of Science and Technology', shortName: 'SRMIST', type: 'Deemed University', state: 'Tamil Nadu', city: 'Kattankulathur', district: 'Chengalpattu', website: 'https://srmist.edu.in' },
  { name: 'PSG College of Technology', shortName: 'PSG Tech', type: 'Autonomous College', state: 'Tamil Nadu', city: 'Coimbatore', district: 'Coimbatore', website: 'https://psgtech.edu' },
  { name: 'SSN College of Engineering', shortName: 'SSNCE', type: 'Autonomous College', state: 'Tamil Nadu', city: 'Kalavakkam', district: 'Chengalpattu', website: 'https://ssn.edu.in' },
  { name: 'SASTRA Deemed University', shortName: 'SASTRA', type: 'Deemed University', state: 'Tamil Nadu', city: 'Thanjavur', district: 'Thanjavur', website: 'https://sastra.edu' },
  { name: 'Amrita Vishwa Vidyapeetham', shortName: 'Amrita', type: 'Deemed University', state: 'Tamil Nadu', city: 'Coimbatore', district: 'Coimbatore', website: 'https://amrita.edu' },
  { name: 'Madras Christian College', shortName: 'MCC', type: 'Autonomous College', state: 'Tamil Nadu', city: 'Chennai', district: 'Chennai', website: 'https://mcc.edu.in' },
  { name: 'Loyola College', shortName: 'Loyola', type: 'Autonomous College', state: 'Tamil Nadu', city: 'Chennai', district: 'Chennai', website: 'https://loyolacollege.edu' },
  { name: 'Coimbatore Institute of Technology', shortName: 'CIT', type: 'Autonomous College', state: 'Tamil Nadu', city: 'Coimbatore', district: 'Coimbatore', website: 'https://cit.edu.in' },

  { name: 'Indian Institute of Technology Bombay', shortName: 'IIT Bombay', type: 'Institute of National Importance', state: 'Maharashtra', city: 'Mumbai', district: 'Mumbai Suburban', website: 'https://iitb.ac.in' },
  { name: 'Visvesvaraya National Institute of Technology Nagpur', shortName: 'VNIT Nagpur', type: 'Institute of National Importance', state: 'Maharashtra', city: 'Nagpur', district: 'Nagpur', website: 'https://vnit.ac.in' },
  { name: 'Veermata Jijabai Technological Institute', shortName: 'VJTI', type: 'Autonomous College', state: 'Maharashtra', city: 'Mumbai', district: 'Mumbai City', website: 'https://vjti.ac.in' },
  { name: 'College of Engineering Pune', shortName: 'COEP', type: 'University', state: 'Maharashtra', city: 'Pune', district: 'Pune', website: 'https://coep.org.in' },
  { name: 'Savitribai Phule Pune University', shortName: 'SPPU', type: 'University', state: 'Maharashtra', city: 'Pune', district: 'Pune', website: 'https://unipune.ac.in' },
  { name: 'University of Mumbai', shortName: 'MU', type: 'University', state: 'Maharashtra', city: 'Mumbai', district: 'Mumbai City', website: 'https://mu.ac.in' },
  { name: 'Institute of Chemical Technology', shortName: 'ICT Mumbai', type: 'Deemed University', state: 'Maharashtra', city: 'Mumbai', district: 'Mumbai City', website: 'https://ictmumbai.edu.in' },
  { name: 'Sardar Patel Institute of Technology', shortName: 'SPIT', type: 'Autonomous College', state: 'Maharashtra', city: 'Mumbai', district: 'Mumbai Suburban', website: 'https://spit.ac.in' },
  { name: 'Symbiosis International University', shortName: 'SIU', type: 'Deemed University', state: 'Maharashtra', city: 'Pune', district: 'Pune', website: 'https://siu.edu.in' },
  { name: 'Vishwakarma Institute of Technology', shortName: 'VIT Pune', type: 'Autonomous College', state: 'Maharashtra', city: 'Pune', district: 'Pune', website: 'https://vit.edu' },
  { name: 'St. Xavier\'s College Mumbai', shortName: 'Xaviers Mumbai', type: 'Autonomous College', state: 'Maharashtra', city: 'Mumbai', district: 'Mumbai City', website: 'https://xaviers.edu' },

  { name: 'Indian Institute of Technology Delhi', shortName: 'IIT Delhi', type: 'Institute of National Importance', state: 'Delhi', city: 'New Delhi', district: 'South Delhi', website: 'https://iitd.ac.in' },
  { name: 'Delhi Technological University', shortName: 'DTU', type: 'University', state: 'Delhi', city: 'Delhi', district: 'North West Delhi', website: 'https://dtu.ac.in' },
  { name: 'Netaji Subhas University of Technology', shortName: 'NSUT', type: 'University', state: 'Delhi', city: 'New Delhi', district: 'South West Delhi', website: 'https://nsut.ac.in' },
  { name: 'Indraprastha Institute of Information Technology Delhi', shortName: 'IIIT Delhi', type: 'University', state: 'Delhi', city: 'New Delhi', district: 'South East Delhi', website: 'https://iiitd.ac.in' },
  { name: 'University of Delhi', shortName: 'DU', type: 'University', state: 'Delhi', city: 'Delhi', district: 'North Delhi', website: 'https://du.ac.in' },
  { name: 'Jawaharlal Nehru University', shortName: 'JNU', type: 'University', state: 'Delhi', city: 'New Delhi', district: 'South West Delhi', website: 'https://jnu.ac.in' },
  { name: 'Jamia Millia Islamia', shortName: 'JMI', type: 'University', state: 'Delhi', city: 'New Delhi', district: 'South East Delhi', website: 'https://jmi.ac.in' },
  { name: 'All India Institute of Medical Sciences Delhi', shortName: 'AIIMS Delhi', type: 'Institute of National Importance', state: 'Delhi', city: 'New Delhi', district: 'South Delhi', website: 'https://aiims.edu' },
  { name: 'Guru Gobind Singh Indraprastha University', shortName: 'GGSIPU', type: 'University', state: 'Delhi', city: 'New Delhi', district: 'South West Delhi', website: 'https://ipu.ac.in' },
  { name: 'St. Stephen\'s College', shortName: 'St. Stephens', type: 'College', state: 'Delhi', city: 'Delhi', district: 'North Delhi', website: 'https://ststephens.edu' },
  { name: 'Shri Ram College of Commerce', shortName: 'SRCC', type: 'College', state: 'Delhi', city: 'Delhi', district: 'North Delhi', website: 'https://srcc.edu' },

  { name: 'Indian Institute of Technology Kanpur', shortName: 'IIT Kanpur', type: 'Institute of National Importance', state: 'Uttar Pradesh', city: 'Kanpur', district: 'Kanpur Nagar', website: 'https://iitk.ac.in' },
  { name: 'Indian Institute of Technology (BHU) Varanasi', shortName: 'IIT BHU', type: 'Institute of National Importance', state: 'Uttar Pradesh', city: 'Varanasi', district: 'Varanasi', website: 'https://iitbhu.ac.in' },
  { name: 'Motilal Nehru National Institute of Technology Allahabad', shortName: 'MNNIT', type: 'Institute of National Importance', state: 'Uttar Pradesh', city: 'Prayagraj', district: 'Prayagraj', website: 'https://mnnit.ac.in' },
  { name: 'Indian Institute of Information Technology Allahabad', shortName: 'IIIT Allahabad', type: 'Institute of National Importance', state: 'Uttar Pradesh', city: 'Prayagraj', district: 'Prayagraj', website: 'https://iiita.ac.in' },
  { name: 'Banaras Hindu University', shortName: 'BHU', type: 'University', state: 'Uttar Pradesh', city: 'Varanasi', district: 'Varanasi', website: 'https://bhu.ac.in' },
  { name: 'Aligarh Muslim University', shortName: 'AMU', type: 'University', state: 'Uttar Pradesh', city: 'Aligarh', district: 'Aligarh', website: 'https://amu.ac.in' },
  { name: 'Dr. A.P.J. Abdul Kalam Technical University', shortName: 'AKTU', type: 'University', state: 'Uttar Pradesh', city: 'Lucknow', district: 'Lucknow', website: 'https://aktu.ac.in' },
  { name: 'Harcourt Butler Technical University', shortName: 'HBTU', type: 'University', state: 'Uttar Pradesh', city: 'Kanpur', district: 'Kanpur Nagar', website: 'https://hbtu.ac.in' },
  { name: 'Madan Mohan Malaviya University of Technology', shortName: 'MMMUT', type: 'University', state: 'Uttar Pradesh', city: 'Gorakhpur', district: 'Gorakhpur', website: 'https://mmmut.ac.in' },
  { name: 'Jaypee Institute of Information Technology', shortName: 'JIIT', type: 'Deemed University', state: 'Uttar Pradesh', city: 'Noida', district: 'Gautam Buddha Nagar', website: 'https://jiit.ac.in' },
  { name: 'Shiv Nadar University', shortName: 'SNU', type: 'University', state: 'Uttar Pradesh', city: 'Greater Noida', district: 'Gautam Buddha Nagar', website: 'https://snu.edu.in' },
  { name: 'Amity University Noida', shortName: 'Amity', type: 'University', state: 'Uttar Pradesh', city: 'Noida', district: 'Gautam Buddha Nagar', website: 'https://amity.edu' },

  { name: 'Indian Institute of Technology Kharagpur', shortName: 'IIT Kharagpur', type: 'Institute of National Importance', state: 'West Bengal', city: 'Kharagpur', district: 'Paschim Medinipur', website: 'https://iitkgp.ac.in' },
  { name: 'Indian Institute of Engineering Science and Technology Shibpur', shortName: 'IIEST Shibpur', type: 'Institute of National Importance', state: 'West Bengal', city: 'Howrah', district: 'Howrah', website: 'https://iiests.ac.in' },
  { name: 'National Institute of Technology Durgapur', shortName: 'NIT Durgapur', type: 'Institute of National Importance', state: 'West Bengal', city: 'Durgapur', district: 'Paschim Bardhaman', website: 'https://nitdgp.ac.in' },
  { name: 'Jadavpur University', shortName: 'JU', type: 'University', state: 'West Bengal', city: 'Kolkata', district: 'Kolkata', website: 'https://jaduniv.edu.in' },
  { name: 'University of Calcutta', shortName: 'CU', type: 'University', state: 'West Bengal', city: 'Kolkata', district: 'Kolkata', website: 'https://caluniv.ac.in' },
  { name: 'Indian Statistical Institute Kolkata', shortName: 'ISI Kolkata', type: 'Institute of National Importance', state: 'West Bengal', city: 'Kolkata', district: 'Kolkata', website: 'https://isical.ac.in' },
  { name: 'Maulana Abul Kalam Azad University of Technology', shortName: 'MAKAUT', type: 'University', state: 'West Bengal', city: 'Kalyani', district: 'Nadia', website: 'https://makautwb.ac.in' },
  { name: 'St. Xavier\'s College Kolkata', shortName: 'SXCK', type: 'Autonomous College', state: 'West Bengal', city: 'Kolkata', district: 'Kolkata', website: 'https://sxccal.edu' },
  { name: 'Presidency University', shortName: 'Presidency', type: 'University', state: 'West Bengal', city: 'Kolkata', district: 'Kolkata', website: 'https://presiuniv.ac.in' },

  { name: 'Indian Institute of Technology Gandhinagar', shortName: 'IITGN', type: 'Institute of National Importance', state: 'Gujarat', city: 'Gandhinagar', district: 'Gandhinagar', website: 'https://iitgn.ac.in' },
  { name: 'Sardar Vallabhbhai National Institute of Technology Surat', shortName: 'SVNIT', type: 'Institute of National Importance', state: 'Gujarat', city: 'Surat', district: 'Surat', website: 'https://svnit.ac.in' },
  { name: 'Dhirubhai Ambani Institute of Information and Communication Technology', shortName: 'DA-IICT', type: 'University', state: 'Gujarat', city: 'Gandhinagar', district: 'Gandhinagar', website: 'https://daiict.ac.in' },
  { name: 'Nirma University', shortName: 'Nirma', type: 'University', state: 'Gujarat', city: 'Ahmedabad', district: 'Ahmedabad', website: 'https://nirmauni.ac.in' },
  { name: 'Pandit Deendayal Energy University', shortName: 'PDEU', type: 'University', state: 'Gujarat', city: 'Gandhinagar', district: 'Gandhinagar', website: 'https://pdeu.ac.in' },
  { name: 'Maharaja Sayajirao University of Baroda', shortName: 'MSU Baroda', type: 'University', state: 'Gujarat', city: 'Vadodara', district: 'Vadodara', website: 'https://msubaroda.ac.in' },
  { name: 'Gujarat Technological University', shortName: 'GTU', type: 'University', state: 'Gujarat', city: 'Ahmedabad', district: 'Ahmedabad', website: 'https://gtu.ac.in' },

  { name: 'National Institute of Technology Calicut', shortName: 'NIT Calicut', type: 'Institute of National Importance', state: 'Kerala', city: 'Kozhikode', district: 'Kozhikode', website: 'https://nitc.ac.in' },
  { name: 'Indian Institute of Technology Palakkad', shortName: 'IIT Palakkad', type: 'Institute of National Importance', state: 'Kerala', city: 'Palakkad', district: 'Palakkad', website: 'https://iitpkd.ac.in' },
  { name: 'APJ Abdul Kalam Technological University', shortName: 'KTU', type: 'University', state: 'Kerala', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', website: 'https://ktu.edu.in' },
  { name: 'College of Engineering Trivandrum', shortName: 'CET', type: 'College', state: 'Kerala', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', website: 'https://cet.ac.in' },
  { name: 'Cochin University of Science and Technology', shortName: 'CUSAT', type: 'University', state: 'Kerala', city: 'Kochi', district: 'Ernakulam', website: 'https://cusat.ac.in' },
  { name: 'TKM College of Engineering', shortName: 'TKMCE', type: 'College', state: 'Kerala', city: 'Kollam', district: 'Kollam', website: 'https://tkmce.ac.in' },

  { name: 'Birla Institute of Technology and Science Pilani', shortName: 'BITS Pilani', type: 'Deemed University', state: 'Rajasthan', city: 'Pilani', district: 'Jhunjhunu', website: 'https://bits-pilani.ac.in' },
  { name: 'Malaviya National Institute of Technology Jaipur', shortName: 'MNIT Jaipur', type: 'Institute of National Importance', state: 'Rajasthan', city: 'Jaipur', district: 'Jaipur', website: 'https://mnit.ac.in' },
  { name: 'Indian Institute of Technology Jodhpur', shortName: 'IIT Jodhpur', type: 'Institute of National Importance', state: 'Rajasthan', city: 'Jodhpur', district: 'Jodhpur', website: 'https://iitj.ac.in' },
  { name: 'The LNM Institute of Information Technology', shortName: 'LNMIIT', type: 'Deemed University', state: 'Rajasthan', city: 'Jaipur', district: 'Jaipur', website: 'https://lnmiit.ac.in' },
  { name: 'University of Rajasthan', shortName: 'UNIRAJ', type: 'University', state: 'Rajasthan', city: 'Jaipur', district: 'Jaipur', website: 'https://uniraj.ac.in' },
  { name: 'Manipal University Jaipur', shortName: 'MUJ', type: 'University', state: 'Rajasthan', city: 'Jaipur', district: 'Jaipur', website: 'https://jaipur.manipal.edu' },

  { name: 'Indian Institute of Technology Ropar', shortName: 'IIT Ropar', type: 'Institute of National Importance', state: 'Punjab', city: 'Rupnagar', district: 'Rupnagar', website: 'https://iitrpr.ac.in' },
  { name: 'Thapar Institute of Engineering and Technology', shortName: 'TIET', type: 'Deemed University', state: 'Punjab', city: 'Patiala', district: 'Patiala', website: 'https://thapar.edu' },
  { name: 'Dr. B. R. Ambedkar National Institute of Technology Jalandhar', shortName: 'NIT Jalandhar', type: 'Institute of National Importance', state: 'Punjab', city: 'Jalandhar', district: 'Jalandhar', website: 'https://nitj.ac.in' },
  { name: 'I. K. Gujral Punjab Technical University', shortName: 'IKGPTU', type: 'University', state: 'Punjab', city: 'Jalandhar', district: 'Kapurthala', website: 'https://ptu.ac.in' },
  { name: 'Panjab University', shortName: 'PU', type: 'University', state: 'Punjab', city: 'Chandigarh', district: 'Chandigarh', website: 'https://puchd.ac.in' },
  { name: 'Lovely Professional University', shortName: 'LPU', type: 'University', state: 'Punjab', city: 'Phagwara', district: 'Kapurthala', website: 'https://lpu.in' },

  { name: 'National Institute of Technology Kurukshetra', shortName: 'NIT Kurukshetra', type: 'Institute of National Importance', state: 'Haryana', city: 'Kurukshetra', district: 'Kurukshetra', website: 'https://nitkkr.ac.in' },
  { name: 'Ashoka University', shortName: 'Ashoka', type: 'University', state: 'Haryana', city: 'Sonipat', district: 'Sonipat', website: 'https://ashoka.edu.in' },
  { name: 'O. P. Jindal Global University', shortName: 'JGU', type: 'University', state: 'Haryana', city: 'Sonipat', district: 'Sonipat', website: 'https://jgu.edu.in' },
  { name: 'YMCA University of Science and Technology (J.C. Bose UST)', shortName: 'YMCA', type: 'University', state: 'Haryana', city: 'Faridabad', district: 'Faridabad', website: 'https://jcboseust.ac.in' },
  { name: 'Kurukshetra University', shortName: 'KUK', type: 'University', state: 'Haryana', city: 'Kurukshetra', district: 'Kurukshetra', website: 'https://kuk.ac.in' },
  { name: 'Maharshi Dayanand University', shortName: 'MDU', type: 'University', state: 'Haryana', city: 'Rohtak', district: 'Rohtak', website: 'https://mdu.ac.in' },

  { name: 'Indian Institute of Technology Indore', shortName: 'IIT Indore', type: 'Institute of National Importance', state: 'Madhya Pradesh', city: 'Indore', district: 'Indore', website: 'https://iiti.ac.in' },
  { name: 'Maulana Azad National Institute of Technology Bhopal', shortName: 'MANIT Bhopal', type: 'Institute of National Importance', state: 'Madhya Pradesh', city: 'Bhopal', district: 'Bhopal', website: 'https://manit.ac.in' },
  { name: 'Atal Bihari Vajpayee Indian Institute of Information Technology and Management Gwalior', shortName: 'IIITM Gwalior', type: 'Institute of National Importance', state: 'Madhya Pradesh', city: 'Gwalior', district: 'Gwalior', website: 'https://iiitm.ac.in' },
  { name: 'Rajiv Gandhi Proudyogiki Vishwavidyalaya', shortName: 'RGPV', type: 'University', state: 'Madhya Pradesh', city: 'Bhopal', district: 'Bhopal', website: 'https://rgpv.ac.in' },
  { name: 'Shri Govindram Seksaria Institute of Technology and Science', shortName: 'SGSITS', type: 'Autonomous College', state: 'Madhya Pradesh', city: 'Indore', district: 'Indore', website: 'https://sgsits.ac.in' },
  { name: 'Vellore Institute of Technology Bhopal', shortName: 'VIT Bhopal', type: 'University', state: 'Madhya Pradesh', city: 'Sehore', district: 'Sehore', website: 'https://vitbhopal.ac.in' },

  { name: 'Indian Institute of Technology Patna', shortName: 'IIT Patna', type: 'Institute of National Importance', state: 'Bihar', city: 'Patna', district: 'Patna', website: 'https://iitp.ac.in' },
  { name: 'National Institute of Technology Patna', shortName: 'NIT Patna', type: 'Institute of National Importance', state: 'Bihar', city: 'Patna', district: 'Patna', website: 'https://nitp.ac.in' },
  { name: 'All India Institute of Medical Sciences Patna', shortName: 'AIIMS Patna', type: 'Institute of National Importance', state: 'Bihar', city: 'Patna', district: 'Patna', website: 'https://aiimspatna.edu.in' },
  { name: 'Patna University', shortName: 'PU Patna', type: 'University', state: 'Bihar', city: 'Patna', district: 'Patna', website: 'https://patnauniversity.ac.in' },
  { name: 'Aryabhatta Knowledge University', shortName: 'AKU Patna', type: 'University', state: 'Bihar', city: 'Patna', district: 'Patna', website: 'https://akubihar.ac.in' },
  { name: 'Birla Institute of Technology Patna', shortName: 'BIT Patna', type: 'College', state: 'Bihar', city: 'Patna', district: 'Patna', website: 'https://bitmesra.ac.in' },

  { name: 'Indian Institute of Technology Bhubaneswar', shortName: 'IIT Bhubaneswar', type: 'Institute of National Importance', state: 'Odisha', city: 'Bhubaneswar', district: 'Khordha', website: 'https://iitbbs.ac.in' },
  { name: 'National Institute of Technology Rourkela', shortName: 'NIT Rourkela', type: 'Institute of National Importance', state: 'Odisha', city: 'Rourkela', district: 'Sundargarh', website: 'https://nitrkl.ac.in' },
  { name: 'Kalinga Institute of Industrial Technology', shortName: 'KIIT', type: 'Deemed University', state: 'Odisha', city: 'Bhubaneswar', district: 'Khordha', website: 'https://kiit.ac.in' },
  { name: 'Siksha \'O\' Anusandhan', shortName: 'SOA', type: 'Deemed University', state: 'Odisha', city: 'Bhubaneswar', district: 'Khordha', website: 'https://soa.ac.in' },
  { name: 'College of Engineering and Technology Bhubaneswar (OUTR)', shortName: 'OUTR', type: 'University', state: 'Odisha', city: 'Bhubaneswar', district: 'Khordha', website: 'https://outr.ac.in' },
  { name: 'Utkal University', shortName: 'Utkal', type: 'University', state: 'Odisha', city: 'Bhubaneswar', district: 'Khordha', website: 'https://utkaluniversity.ac.in' },

  { name: 'Indian Institute of Technology (ISM) Dhanbad', shortName: 'IIT ISM', type: 'Institute of National Importance', state: 'Jharkhand', city: 'Dhanbad', district: 'Dhanbad', website: 'https://iitism.ac.in' },
  { name: 'Birla Institute of Technology Mesra', shortName: 'BIT Mesra', type: 'Deemed University', state: 'Jharkhand', city: 'Ranchi', district: 'Ranchi', website: 'https://bitmesra.ac.in' },
  { name: 'National Institute of Technology Jamshedpur', shortName: 'NIT Jamshedpur', type: 'Institute of National Importance', state: 'Jharkhand', city: 'Jamshedpur', district: 'East Singhbhum', website: 'https://nitjsr.ac.in' },
  { name: 'Xavier Labour Relations Institute', shortName: 'XLRI', type: 'Institute of National Importance', state: 'Jharkhand', city: 'Jamshedpur', district: 'East Singhbhum', website: 'https://xlri.ac.in' },
  { name: 'Ranchi University', shortName: 'RU', type: 'University', state: 'Jharkhand', city: 'Ranchi', district: 'Ranchi', website: 'https://ranchiuniversity.ac.in' },

  { name: 'National Institute of Technology Raipur', shortName: 'NIT Raipur', type: 'Institute of National Importance', state: 'Chhattisgarh', city: 'Raipur', district: 'Raipur', website: 'https://nitrr.ac.in' },
  { name: 'Indian Institute of Technology Bhilai', shortName: 'IIT Bhilai', type: 'Institute of National Importance', state: 'Chhattisgarh', city: 'Bhilai', district: 'Durg', website: 'https://iitbhilai.ac.in' },
  { name: 'International Institute of Information Technology Naya Raipur', shortName: 'IIIT Naya Raipur', type: 'University', state: 'Chhattisgarh', city: 'Naya Raipur', district: 'Raipur', website: 'https://iiitnr.ac.in' },
  { name: 'Chhattisgarh Swami Vivekanand Technical University', shortName: 'CSVTU', type: 'University', state: 'Chhattisgarh', city: 'Bhilai', district: 'Durg', website: 'https://csvtu.ac.in' },

  { name: 'Indian Institute of Technology Guwahati', shortName: 'IIT Guwahati', type: 'Institute of National Importance', state: 'Assam', city: 'Guwahati', district: 'Kamrup', website: 'https://iitg.ac.in' },
  { name: 'National Institute of Technology Silchar', shortName: 'NIT Silchar', type: 'Institute of National Importance', state: 'Assam', city: 'Silchar', district: 'Cachar', website: 'https://nits.ac.in' },
  { name: 'Gauhati University', shortName: 'GU', type: 'University', state: 'Assam', city: 'Guwahati', district: 'Kamrup', website: 'https://gauhati.ac.in' },
  { name: 'Tezpur University', shortName: 'TU', type: 'University', state: 'Assam', city: 'Tezpur', district: 'Sonitpur', website: 'https://tezu.ernet.in' },
  { name: 'Assam Engineering College', shortName: 'AEC', type: 'College', state: 'Assam', city: 'Guwahati', district: 'Kamrup', website: 'https://aec.ac.in' },

  { name: 'Indian Institute of Technology Roorkee', shortName: 'IIT Roorkee', type: 'Institute of National Importance', state: 'Uttarakhand', city: 'Roorkee', district: 'Haridwar', website: 'https://iitr.ac.in' },
  { name: 'National Institute of Technology Uttarakhand', shortName: 'NIT UK', type: 'Institute of National Importance', state: 'Uttarakhand', city: 'Srinagar', district: 'Pauri Garhwal', website: 'https://nituk.ac.in' },
  { name: 'University of Petroleum and Energy Studies', shortName: 'UPES', type: 'University', state: 'Uttarakhand', city: 'Dehradun', district: 'Dehradun', website: 'https://upes.ac.in' },
  { name: 'Graphic Era University', shortName: 'GEU', type: 'Deemed University', state: 'Uttarakhand', city: 'Dehradun', district: 'Dehradun', website: 'https://geu.ac.in' },
  { name: 'Govind Ballabh Pant University of Agriculture and Technology', shortName: 'GBPUAT', type: 'University', state: 'Uttarakhand', city: 'Pantnagar', district: 'Udham Singh Nagar', website: 'https://gbpuat.ac.in' },

  { name: 'Indian Institute of Technology Mandi', shortName: 'IIT Mandi', type: 'Institute of National Importance', state: 'Himachal Pradesh', city: 'Mandi', district: 'Mandi', website: 'https://iitmandi.ac.in' },
  { name: 'National Institute of Technology Hamirpur', shortName: 'NIT Hamirpur', type: 'Institute of National Importance', state: 'Himachal Pradesh', city: 'Hamirpur', district: 'Hamirpur', website: 'https://nith.ac.in' },
  { name: 'Jaypee University of Information Technology', shortName: 'JUIT Waknaghat', type: 'University', state: 'Himachal Pradesh', city: 'Waknaghat', district: 'Solan', website: 'https://juit.ac.in' },
  { name: 'Himachal Pradesh University', shortName: 'HPU', type: 'University', state: 'Himachal Pradesh', city: 'Shimla', district: 'Shimla', website: 'https://hpuniv.ac.in' },

  { name: 'Birla Institute of Technology and Science Pilani - K. K. Birla Goa Campus', shortName: 'BITS Goa', type: 'Deemed University', state: 'Goa', city: 'Zuarinagar', district: 'South Goa', website: 'https://bits-pilani.ac.in/goa' },
  { name: 'National Institute of Technology Goa', shortName: 'NIT Goa', type: 'Institute of National Importance', state: 'Goa', city: 'Cuncolim', district: 'South Goa', website: 'https://nitgoa.ac.in' },
  { name: 'Indian Institute of Technology Goa', shortName: 'IIT Goa', type: 'Institute of National Importance', state: 'Goa', city: 'Ponda', district: 'North Goa', website: 'https://iitgoa.ac.in' },
  { name: 'Goa University', shortName: 'GU Goa', type: 'University', state: 'Goa', city: 'Taleigao', district: 'North Goa', website: 'https://unigoa.ac.in' },
  { name: 'Goa College of Engineering', shortName: 'GEC', type: 'College', state: 'Goa', city: 'Farmagudi', district: 'North Goa', website: 'https://gec.ac.in' },

  { name: 'National Institute of Technology Srinagar', shortName: 'NIT Srinagar', type: 'Institute of National Importance', state: 'Jammu and Kashmir', city: 'Srinagar', district: 'Srinagar', website: 'https://nitsri.ac.in' },
  { name: 'Indian Institute of Technology Jammu', shortName: 'IIT Jammu', type: 'Institute of National Importance', state: 'Jammu and Kashmir', city: 'Jammu', district: 'Jammu', website: 'https://iitjammu.ac.in' },
  { name: 'University of Kashmir', shortName: 'KU Kashmir', type: 'University', state: 'Jammu and Kashmir', city: 'Srinagar', district: 'Srinagar', website: 'https://kashmiruniversity.net' },
  { name: 'University of Jammu', shortName: 'JU Jammu', type: 'University', state: 'Jammu and Kashmir', city: 'Jammu', district: 'Jammu', website: 'https://jammuuniversity.ac.in' },
  { name: 'Shri Mata Vaishno Devi University', shortName: 'SMVDU', type: 'University', state: 'Jammu and Kashmir', city: 'Katra', district: 'Reasi', website: 'https://smvdu.ac.in' },

  { name: 'Punjab Engineering College', shortName: 'PEC Chandigarh', type: 'Deemed University', state: 'Chandigarh', city: 'Chandigarh', district: 'Chandigarh', website: 'https://pec.ac.in' },
  { name: 'Postgraduate Institute of Medical Education and Research', shortName: 'PGIMER', type: 'Institute of National Importance', state: 'Chandigarh', city: 'Chandigarh', district: 'Chandigarh', website: 'https://pgimer.edu.in' },
  { name: 'Chandigarh College of Engineering and Technology', shortName: 'CCET', type: 'College', state: 'Chandigarh', city: 'Chandigarh', district: 'Chandigarh', website: 'https://ccet.ac.in' },

  { name: 'Pondicherry University', shortName: 'PU Pondicherry', type: 'University', state: 'Puducherry', city: 'Puducherry', district: 'Puducherry', website: 'https://pondiuni.edu.in' },
  { name: 'National Institute of Technology Puducherry', shortName: 'NITPY', type: 'Institute of National Importance', state: 'Puducherry', city: 'Karaikal', district: 'Karaikal', website: 'https://nitpy.ac.in' },
  { name: 'Jawaharlal Institute of Postgraduate Medical Education and Research', shortName: 'JIPMER', type: 'Institute of National Importance', state: 'Puducherry', city: 'Puducherry', district: 'Puducherry', website: 'https://jipmer.edu.in' },
  { name: 'Puducherry Technological University', shortName: 'PTU Pondicherry', type: 'University', state: 'Puducherry', city: 'Puducherry', district: 'Puducherry', website: 'https://ptupuducherry.ac.in' },

  { name: 'National Institute of Technology Agartala', shortName: 'NIT Agartala', type: 'Institute of National Importance', state: 'Tripura', city: 'Agartala', district: 'West Tripura', website: 'https://nita.ac.in' },
  { name: 'Tripura University', shortName: 'TU Agartala', type: 'University', state: 'Tripura', city: 'Suryamaninagar', district: 'West Tripura', website: 'https://tripurauniv.ac.in' },

  { name: 'National Institute of Technology Meghalaya', shortName: 'NIT Meghalaya', type: 'Institute of National Importance', state: 'Meghalaya', city: 'Shillong', district: 'East Khasi Hills', website: 'https://nitm.ac.in' },
  { name: 'North-Eastern Hill University', shortName: 'NEHU', type: 'University', state: 'Meghalaya', city: 'Shillong', district: 'East Khasi Hills', website: 'https://nehu.ac.in' },
  { name: 'Indian Institute of Management Shillong', shortName: 'IIM Shillong', type: 'Institute of National Importance', state: 'Meghalaya', city: 'Shillong', district: 'East Khasi Hills', website: 'https://iimshillong.ac.in' },

  { name: 'National Institute of Technology Manipur', shortName: 'NIT Manipur', type: 'Institute of National Importance', state: 'Manipur', city: 'Imphal', district: 'Imphal West', website: 'https://nitmanipur.ac.in' },
  { name: 'Indian Institute of Information Technology Manipur', shortName: 'IIIT Manipur', type: 'Institute of National Importance', state: 'Manipur', city: 'Imphal', district: 'Imphal West', website: 'https://iiitmanipur.ac.in' },
  { name: 'Manipur University', shortName: 'MU Imphal', type: 'University', state: 'Manipur', city: 'Imphal', district: 'Imphal West', website: 'https://manipuruniv.ac.in' },

  { name: 'National Institute of Technology Mizoram', shortName: 'NIT Mizoram', type: 'Institute of National Importance', state: 'Mizoram', city: 'Aizawl', district: 'Aizawl', website: 'https://nitmz.ac.in' },
  { name: 'Mizoram University', shortName: 'MZU', type: 'University', state: 'Mizoram', city: 'Aizawl', district: 'Aizawl', website: 'https://mzu.edu.in' },

  { name: 'National Institute of Technology Nagaland', shortName: 'NIT Nagaland', type: 'Institute of National Importance', state: 'Nagaland', city: 'Chumukedima', district: 'Chumukedima', website: 'https://nitnagaland.ac.in' },
  { name: 'Nagaland University', shortName: 'NU', type: 'University', state: 'Nagaland', city: 'Lumami', district: 'Zunheboto', website: 'https://nagalanduniversity.ac.in' },

  { name: 'National Institute of Technology Arunachal Pradesh', shortName: 'NIT Arunachal', type: 'Institute of National Importance', state: 'Arunachal Pradesh', city: 'Jote', district: 'Papum Pare', website: 'https://nitap.ac.in' },
  { name: 'North Eastern Regional Institute of Science and Technology', shortName: 'NERIST', type: 'Deemed University', state: 'Arunachal Pradesh', city: 'Nirjuli', district: 'Papum Pare', website: 'https://nerist.ac.in' },
  { name: 'Rajiv Gandhi University', shortName: 'RGU', type: 'University', state: 'Arunachal Pradesh', city: 'Doimukh', district: 'Papum Pare', website: 'https://rgu.ac.in' },

  { name: 'National Institute of Technology Sikkim', shortName: 'NIT Sikkim', type: 'Institute of National Importance', state: 'Sikkim', city: 'Ravangla', district: 'Namchi', website: 'https://nitsikkim.ac.in' },
  { name: 'Sikkim Manipal Institute of Technology', shortName: 'SMIT', type: 'University', state: 'Sikkim', city: 'Majitar', district: 'Pakyong', website: 'https://smu.edu.in/smit' },
  { name: 'Sikkim University', shortName: 'SU', type: 'University', state: 'Sikkim', city: 'Gangtok', district: 'Gangtok', website: 'https://cus.ac.in' },

  { name: 'Dr. B. R. Ambedkar Institute of Technology', shortName: 'DBRAIT', type: 'College', state: 'Andaman and Nicobar Islands', city: 'Port Blair', district: 'South Andaman', website: 'https://dbrait.andaman.gov.in' },
  { name: 'Andaman and Nicobar Islands Institute of Medical Sciences', shortName: 'ANIIMS', type: 'College', state: 'Andaman and Nicobar Islands', city: 'Port Blair', district: 'South Andaman', website: 'https://aniims.org' },
  { name: 'Jawaharlal Nehru Rajkeeya Mahavidyalaya', shortName: 'JNRM', type: 'College', state: 'Andaman and Nicobar Islands', city: 'Port Blair', district: 'South Andaman', website: 'https://jnrm.and.nic.in' },

  { name: 'University of Ladakh', shortName: 'UOL', type: 'University', state: 'Ladakh', city: 'Leh', district: 'Leh', website: 'https://universityofladakh.ac.in' },
  { name: 'Eliezer Joldan Memorial College Leh', shortName: 'EJM College', type: 'College', state: 'Ladakh', city: 'Leh', district: 'Leh', website: 'https://ejmcollegeleh.in' },
  { name: 'Government Degree College Kargil', shortName: 'GDC Kargil', type: 'College', state: 'Ladakh', city: 'Kargil', district: 'Kargil', website: 'https://gdckargil.in' },

  { name: 'Dr. S. & S. S. Ghandhy Government Engineering College (Silvassa Campus / GEC)', shortName: 'GEC Daman', type: 'College', state: 'Dadra and Nagar Haveli and Daman and Diu', city: 'Daman', district: 'Daman', website: 'https://daman.nic.in' },
  { name: 'Government College Daman', shortName: 'GC Daman', type: 'College', state: 'Dadra and Nagar Haveli and Daman and Diu', city: 'Daman', district: 'Daman', website: 'https://daman.nic.in' },
  { name: 'Dr. APJ Abdul Kalam Government College Silvassa', shortName: 'APJAKGC Silvassa', type: 'College', state: 'Dadra and Nagar Haveli and Daman and Diu', city: 'Silvassa', district: 'Dadra and Nagar Haveli', website: 'https://dnh.gov.in' },

  { name: 'Calicut University Centre Kadmat', shortName: 'CUC Kadmat', type: 'College', state: 'Lakshadweep', city: 'Kadmat Island', district: 'Lakshadweep', website: 'https://uoc.ac.in' },
  { name: 'Government Jawaharlal Nehru College Kavaratti', shortName: 'JNC Kavaratti', type: 'College', state: 'Lakshadweep', city: 'Kavaratti', district: 'Lakshadweep', website: 'https://lakshadweep.gov.in' },
  { name: 'Mahatma Gandhi College Andrott', shortName: 'MG College Andrott', type: 'College', state: 'Lakshadweep', city: 'Andrott Island', district: 'Lakshadweep', website: 'https://lakshadweep.gov.in' },
];

export async function seedColleges() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for College Seeding...');

    const operations = INSTITUTIONS.map((inst) => {
      const normalizedName = inst.name.trim().toLowerCase();
      return {
        updateOne: {
          filter: {
            normalizedName,
            state: inst.state.trim(),
            city: (inst.city || '').trim()
          },
          update: {
            $set: {
              name: inst.name.trim(),
              normalizedName,
              shortName: (inst.shortName || '').trim(),
              type: inst.type || 'College',
              state: inst.state.trim(),
              city: (inst.city || '').trim(),
              district: (inst.district || '').trim(),
              website: (inst.website || '').trim(),
              isActive: true,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await College.bulkWrite(operations);
    console.log(`[SEED RESULT] Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);

    const dbStates = await College.distinct('state', { isActive: true });

    const statesFound = ALL_28_STATES.filter(s => dbStates.includes(s));
    const utsFound = ALL_8_UTS.filter(u => dbStates.includes(u));

    console.log('\n========================================');
    console.log('DATABASE AUDIT & VERIFICATION SUMMARY:');
    console.log('========================================');
    console.log(`Total 28 States Found in DB: ${statesFound.length} / 28`);
    console.log(`Total 8 UTs Found in DB:     ${utsFound.length} / 8`);
    console.log(`Total Distinct Regions:     ${dbStates.length} / 36`);

    const totalInstitutions = await College.countDocuments({ isActive: true });
    console.log(`Total Active Institutions:  ${totalInstitutions}`);

    console.log('\nBreakdown per State / UT:');
    const breakdown = await College.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    breakdown.forEach(item => {
      console.log(` - ${item._id.padEnd(45, '.')}: ${item.count}`);
    });

    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('MongoDB disconnected cleanly.');
    return {
      totalInstitutions,
      statesCount: statesFound.length,
      utsCount: utsFound.length,
      breakdown,
    };
  } catch (error) {
    console.error('Error during college seeding:', error);
    await mongoose.disconnect();
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedColleges()
    .then(() => {
      console.log('College seeding completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('College seeding failed:', err);
      process.exit(1);
    });
}
