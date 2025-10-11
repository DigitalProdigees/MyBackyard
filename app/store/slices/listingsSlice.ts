import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';

export interface Listing {
  id: string;
  title: string;
  pricePerHour: number;
  location: string; // e.g., "City, Country"
  distance?: string; // optional display-only
  dimensions?: string; // optional display-only
  mainImage?: any; // optional, can be a require() or URI
  thumbnails?: any[];
  features?: string[];
  additionalServices?: string[];
  description?: string;
  aboutOwner?: string;
  houseRules?: string[];
  cancellationPolicy?: string;
  country?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Owner information for chat functionality
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: any;
  ownerEmail?: string;
  // Persist data entered via "Calculate Now" so it can be prefilled when editing
  calculateArea?: {
    address: string;
    size: string; // number as string to keep input simple
  };
  // Available weekdays for booking
  availableWeekdays?: string[];
  // Available times for booking
  availableTimes?: {
    startTime: string;
    endTime: string;
  };
}

export interface ListingsState {
  items: Listing[];
  selectedId: string | null;
}

const initialState: ListingsState = {
  items: [
    {
      id: '1',
      title: 'Beautiful Garden Backyard',
      pricePerHour: 50,
      location: 'Washington DC, USA',
      distance: '1.5 KM',
      dimensions: '100m - 200m',
      mainImage: require('../../../assets/icons/renter_home_1.png'),
      thumbnails: [
        require('../../../assets/icons/renter_home_1.png'),
        require('../../../assets/icons/renter_home_2.png'),
      ],
      features: ['Garden', 'BBQ Area', 'Swimming Pool'],
      additionalServices: ['Catering', 'Cleaning'],
      description: 'A beautiful garden backyard perfect for parties and events.',
      aboutOwner: 'I love hosting events and sharing my beautiful space with others.',
      houseRules: ['No smoking', 'No loud music after 10 PM'],
      cancellationPolicy: 'Free cancellation up to 24 hours before the event.',
      ownerId: 'owner_1',
      ownerName: 'Sarah Johnson',
      ownerAvatar: require('../../../assets/icons/profile.png'),
      ownerEmail: 'sarah.johnson@email.com',
      availableWeekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableTimes: {
        startTime: '09:00',
        endTime: '17:00'
      }
    },
    {
      id: '2',
      title: 'Modern Rooftop Space',
      pricePerHour: 75,
      location: 'New York, USA',
      distance: '2.3 KM',
      dimensions: '150m - 250m',
      mainImage: require('../../../assets/icons/renter_home_2.png'),
      thumbnails: [
        require('../../../assets/icons/renter_home_2.png'),
        require('../../../assets/icons/renter_home_1.png'),
      ],
      features: ['City View', 'Outdoor Kitchen', 'Sound System'],
      additionalServices: ['Security', 'Bartender'],
      description: 'Stunning rooftop space with panoramic city views.',
      aboutOwner: 'Professional event host with years of experience.',
      houseRules: ['Maximum 50 guests', 'No glass containers'],
      cancellationPolicy: '50% refund for cancellations within 48 hours.',
      ownerId: 'owner_2',
      ownerName: 'Michael Chen',
      ownerAvatar: require('../../../assets/icons/profile.png'),
      ownerEmail: 'michael.chen@email.com',
      availableWeekdays: ['Saturday', 'Sunday'],
      availableTimes: {
        startTime: '10:00',
        endTime: '22:00'
      }
    }
  ],
  selectedId: null,
};

type AddListingPayload = Omit<Listing, 'id'> & { id?: string };

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    setListings(state, action: PayloadAction<Listing[]>) {
      state.items = action.payload;
    },
    addListing: {
      reducer(state, action: PayloadAction<Listing>) {
        state.items.unshift(action.payload);
        state.selectedId = action.payload.id;
      },
      prepare(payload: AddListingPayload) {
        return {
          payload: {
            id: payload.id ?? nanoid(),
            ...payload,
          } as Listing,
        };
      },
    },
    removeListing(state, action: PayloadAction<string>) {
      state.items = state.items.filter(l => l.id !== action.payload);
      if (state.selectedId === action.payload) {
        state.selectedId = null;
      }
    },
    updateListing(state, action: PayloadAction<Listing>) {
      const idx = state.items.findIndex(l => l.id === action.payload.id);
      if (idx !== -1) {
        state.items[idx] = action.payload;
      }
    },
    selectListing(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
  },
});

export const { setListings, addListing, removeListing, updateListing, selectListing } =
  listingsSlice.actions;
export default listingsSlice.reducer;
