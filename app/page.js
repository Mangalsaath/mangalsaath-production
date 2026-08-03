"use client";
import { useEffect, useMemo, useState } from "react";
import AdminConsole from "@/components/AdminConsole";
import { isAdminRole } from "@/lib/roles";

async function api(path, options = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ms_token") : "";
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json")
    ? await res.json()
    : { error: (await res.text()) || "Request failed" };
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}
const passwordRules = (value) => ({
  length: String(value || "").length >= 8,
  uppercase: /[A-Z]/.test(String(value || "")),
  lowercase: /[a-z]/.test(String(value || "")),
  number: /\d/.test(String(value || "")),
  symbol: /[^A-Za-z0-9]/.test(String(value || "")),
});
const validPassword = (value) =>
  Object.values(passwordRules(value)).every(Boolean);
const blank = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
  gender: "",
  dateOfBirth: "",
  placeOfBirth: "",
  timeOfBirth: "",
  maritalStatus: "",
  height: "",
  religion: "",
  caste: "",
  subCaste: "",
  gotra: "",
  education: "",
  profession: "",
  annualCtc: "",
  brothersMarried: "",
  brothersUnmarried: "",
  sistersMarried: "",
  sistersUnmarried: "",
  country: "India",
  state: "",
  city: "",
  about: "",
  partnerAgeMin: "",
  partnerAgeMax: "",
  partnerReligion: "Open",
  partnerCaste: "Open",
  partnerLocation: "Open",
  partnerMaritalStatus: "Open",
  partnerEducation: "Open",
  partnerProfession: "Open",
  photos: [],
  termsAccepted: false,
};
const profileKeys = [
  "name",
  "gender",
  "dateOfBirth",
  "placeOfBirth",
  "timeOfBirth",
  "maritalStatus",
  "height",
  "religion",
  "caste",
  "subCaste",
  "gotra",
  "education",
  "profession",
  "annualCtc",
  "brothersMarried",
  "brothersUnmarried",
  "sistersMarried",
  "sistersUnmarried",
  "country",
  "state",
  "city",
  "about",
  "partnerAgeMin",
  "partnerAgeMax",
  "partnerReligion",
  "partnerCaste",
  "partnerLocation",
  "partnerMaritalStatus",
  "partnerEducation",
  "partnerProfession",
  "photos",
  "primaryPhoto",
];
const currentYear = new Date().getFullYear();
const dobYears = Array.from({ length: 63 }, (_, i) =>
  String(currentYear - 18 - i),
);
const dobMonths = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];
const dobDays = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
const maritalOptions = [
  "Never Married",
  "Divorced",
  "Widowed",
  "Awaiting Divorce",
  "Annulled",
];
const religionOptions = [
  "Hindu",
  "Muslim",
  "Sikh",
  "Christian",
  "Jain",
  "Buddhist",
  "Parsi",
  "Jewish",
  "Spiritual",
  "No Religion",
  "Other",
];
const casteOptions = [
  "Open / No preference",
  "Brahmin",
  "Rajput",
  "Khatri",
  "Arora",
  "Jat",
  "Gurjar",
  "Yadav",
  "Vaishya",
  "Agarwal",
  "Kayastha",
  "Reddy",
  "Kamma",
  "Nair",
  "Nadar",
  "Maratha",
  "Lingayat",
  "Vokkaliga",
  "Scheduled Caste",
  "Scheduled Tribe",
  "Other",
];
const educationOptions = [
  "High School",
  "Diploma",
  "Graduate",
  "B.A.",
  "B.Com.",
  "B.Sc.",
  "B.Tech / B.E.",
  "BBA",
  "BCA",
  "Post Graduate",
  "M.A.",
  "M.Com.",
  "M.Sc.",
  "M.Tech / M.E.",
  "MBA / PGDM",
  "MCA",
  "MBBS",
  "BDS",
  "MD / MS",
  "CA",
  "CS",
  "LLB",
  "LLM",
  "PhD",
  "Other",
];
const professionOptions = [
  "Business Owner",
  "Government Employee",
  "Defence Services",
  "Doctor",
  "Dentist",
  "Engineer",
  "Software Professional",
  "Teacher / Professor",
  "Banking Professional",
  "Chartered Accountant",
  "Finance Professional",
  "Lawyer",
  "Consultant",
  "Manager",
  "Sales & Marketing",
  "Healthcare Professional",
  "Artist / Media Professional",
  "Self Employed",
  "Farmer",
  "Not Working",
  "Student",
  "Other",
];
const countryOptions = [
  "India",
  "Netherlands",
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "New Zealand",
  "United Arab Emirates",
  "Germany",
  "France",
  "Singapore",
  "Other",
];
const stateOptions = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Outside India",
];
const cityOptions = [
  "Ahmedabad",
  "Bengaluru",
  "Bhopal",
  "Chandigarh",
  "Chennai",
  "Dehradun",
  "Delhi",
  "Faridabad",
  "Ghaziabad",
  "Gurugram",
  "Hyderabad",
  "Indore",
  "Jaipur",
  "Karnal",
  "Kochi",
  "Kolkata",
  "Lucknow",
  "Ludhiana",
  "Mumbai",
  "Nagpur",
  "New Delhi",
  "Noida",
  "Panipat",
  "Patna",
  "Pune",
  "Surat",
  "Other",
];

export default function Home() {
  const [adminSecurityStep, setAdminSecurityStep] = useState({
    required: false,
    question: "",
  });
  const [view, setView] = useState("home"),
    [user, setUser] = useState(null),
    [profiles, setProfiles] = useState([]),
    [ownProfile, setOwnProfile] = useState(null),
    [sent, setSent] = useState([]),
    [received, setReceived] = useState([]),
    [messages, setMessages] = useState([]),
    [admin, setAdmin] = useState(null),
    [selected, setSelected] = useState(null),
    [city, setCity] = useState("Any"),
    [verified, setVerified] = useState(false),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(""),
    [messageText, setMessageText] = useState(""),
    [messageProfile, setMessageProfile] = useState(null),
    [login, setLogin] = useState({
      identifier: "",
      password: "",
      securityAnswer: "",
    }),
    [register, setRegister] = useState(blank),
    [edit, setEdit] = useState(null),
    [interestBusy, setInterestBusy] = useState(""),
    [verificationBusy, setVerificationBusy] = useState(false),
    [religion, setReligion] = useState("Any"),
    [maritalStatus, setMaritalStatus] = useState("Any"),
    [ageMin, setAgeMin] = useState(""),
    [ageMax, setAgeMax] = useState(""),
    [sort, setSort] = useState("match"),
    [page, setPage] = useState(1),
    [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 }),
    [shortlisted, setShortlisted] = useState([]),
    [notifications, setNotifications] = useState([]),
    [activeConversation, setActiveConversation] = useState(null),
    [communicationBusy, setCommunicationBusy] = useState(""),
    [membership, setMembership] = useState(null),
    [plans, setPlans] = useState([]),
    [transactions, setTransactions] = useState([]),
    [membershipBusy, setMembershipBusy] = useState(""),
    [couponCode, setCouponCode] = useState(""),
    [couponApplied, setCouponApplied] = useState(false),
    [openMenu, setOpenMenu] = useState(""),
    [verificationDocType, setVerificationDocType] = useState("Aadhaar"),
    [verificationDocLast4, setVerificationDocLast4] = useState(""),
    [adminReviewNotes, setAdminReviewNotes] = useState({}),
    [registrationStep, setRegistrationStep] = useState("details"),
    [otpChallengeId, setOtpChallengeId] = useState(""),
    [otp, setOtp] = useState(""),
    [demoOtp, setDemoOtp] = useState(""),
    [registrationBusy, setRegistrationBusy] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [showConfirmPassword, setShowConfirmPassword] = useState(false),
    [adminPassword, setAdminPassword] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [adminPasswordBusy, setAdminPasswordBusy] = useState(false),
    [showAdminPasswords, setShowAdminPasswords] = useState(false),
    [reset, setReset] = useState({
      identifier: "",
      challengeId: "",
      otp: "",
      password: "",
      confirmPassword: "",
    }),
    [resetStep, setResetStep] = useState("request"),
    [resetBusy, setResetBusy] = useState(false),
    [resetDemoOtp, setResetDemoOtp] = useState(""),
    [paymentConfig, setPaymentConfig] = useState({
      upiId: "",
      qrImage: "/payment-qr.png",
      paymentInstructions: "",
    }),
    [paymentForm, setPaymentForm] = useState({
      planId: "",
      utr: "",
      screenshot: "",
    }),
    [coupons, setCoupons] = useState([]),
    [siteConfig, setSiteConfig] = useState({
      businessName: "M/s Tradewave Enterprises",
      businessAddress: "Ghaziabad, Uttar Pradesh – 201009",
      gstin: "09KKIPS7473B1ZJ",
      supportEmail: "contact@mangalsaath.com",
      supportMobile: "+91 7988663797",
      footerCopyright: "© 2026 Mangalsaath. All rights reserved.",
    }),
    [adminSettings, setAdminSettings] = useState(null),
    [adminSaving, setAdminSaving] = useState(false),
    [qrUploading, setQrUploading] = useState(false),
    [planDraft, setPlanDraft] = useState(null),
    [couponDraft, setCouponDraft] = useState(null),
    [homepageData, setHomepageData] = useState({
      offers: [],
      primaryOffer: null,
      stats: {
        totalVisitors: 0,
        totalVisits: 0,
        todayVisitors: 0,
        registeredMembers: 0,
        verifiedProfiles: 0,
        premiumMembers: 0,
      },
    }),
    [offerDraft, setOfferDraft] = useState(null),
    [adminOtp, setAdminOtp] = useState({
      challengeId: "",
      emailOtp: "",
      emailMasked: "",
      demoEmailOtp: "",
    }),
    [adminOtpBusy, setAdminOtpBusy] = useState(false),
    [editStep, setEditStep] = useState(1),
    [checkoutQuote, setCheckoutQuote] = useState(null),
    [onlinePaymentBusy, setOnlinePaymentBusy] = useState(false),
    [profileSaving, setProfileSaving] = useState(false),
    [profilePhotoBusy, setProfilePhotoBusy] = useState(false),
    [interestTab, setInterestTab] = useState("received"),
    [acceptedSearch, setAcceptedSearch] = useState(""),
    [acceptedFilter, setAcceptedFilter] = useState("all"),
    [adminMemberSearch, setAdminMemberSearch] = useState(""),
    [adminMemberFilter, setAdminMemberFilter] = useState("pending"),
    [adminSelectedMember, setAdminSelectedMember] = useState(null),
    [adminActionBusy, setAdminActionBusy] = useState("");
  const supportEmail = siteConfig?.supportEmail || "contact@mangalsaath.com";
  const featuredOffer = homepageData.primaryOffer || null;
  const featuredCoupon = featuredOffer?.couponCode
    ? coupons.find((c) => c.code === featuredOffer.couponCode)
    : coupons[0] || null;
  const cities = useMemo(
    () => ["Any", ...new Set(profiles.map((p) => p.city).filter(Boolean))],
    [profiles],
  );
  const religions = useMemo(
    () => ["Any", ...new Set(profiles.map((p) => p.religion).filter(Boolean))],
    [profiles],
  );
  const myProfile = useMemo(
    () => ownProfile || profiles.find((p) => p.userId === user?.id),
    [ownProfile, profiles, user],
  );
  const sentIds = useMemo(() => new Set(sent.map((i) => i.profileId)), [sent]);
  const shortlistIds = useMemo(() => new Set(shortlisted), [shortlisted]);
  const shortlistedProfiles = useMemo(
    () => profiles.filter((p) => shortlistIds.has(p.id)),
    [profiles, shortlistIds],
  );
  const completionData = useMemo(() => {
    if (!myProfile) return { percent: 0, missing: [] };
    const fields = [
      ["name", "Full name"],
      ["gender", "Gender"],
      ["dateOfBirth", "Date of birth"],
      ["placeOfBirth", "Place of birth"],
      ["timeOfBirth", "Time of birth"],
      ["maritalStatus", "Marital status"],
      ["height", "Height"],
      ["religion", "Religion"],
      ["caste", "Caste"],
      ["education", "Education"],
      ["profession", "Profession"],
      ["annualCtc", "Annual CTC / income"],
      ["country", "Country"],
      ["state", "State"],
      ["city", "City"],
      ["about", "About me"],
      ["partnerAgeMin", "Partner age range"],
      ["partnerAgeMax", "Partner age range"],
      ["partnerReligion", "Partner religion"],
      ["partnerLocation", "Partner location"],
      ["photos", "Profile photo"],
    ];
    const done = fields.filter(([k]) =>
      k === "photos"
        ? (myProfile.photos || []).length > 0
        : String(myProfile[k] || "").trim(),
    ).length;
    return {
      percent: Math.round((done / fields.length) * 100),
      missing: fields
        .filter(([k]) =>
          k === "photos"
            ? !(myProfile.photos || []).length
            : !String(myProfile[k] || "").trim(),
        )
        .map(([, label]) => label)
        .filter((x, i, a) => a.indexOf(x) === i),
    };
  }, [myProfile]);
  const completion = myProfile?.profileCompletion ?? completionData.percent;
  const trustScore = myProfile?.trustScore ?? 0;
  const trustLevel = myProfile?.trustLevel || "Basic";
  const unreadMessages = useMemo(
    () => messages.filter((m) => m.toUserId === user?.id && !m.read).length,
    [messages, user],
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const pendingReceived = useMemo(
    () => received.filter((i) => i.status === "Pending"),
    [received],
  );
  const acceptedMembers = useMemo(() => {
    if (!user) return [];
    const byUser = new Map();
    [...sent, ...received]
      .filter((i) => i.status === "Accepted")
      .forEach((i) => {
        const otherUserId =
          i.fromUserId === user.id ? i.toUserId : i.fromUserId;
        const profile =
          i.otherProfile || profiles.find((p) => p.userId === otherUserId);
        if (!profile) return;
        const acceptedAt = i.updatedAt || i.createdAt;
        const current = byUser.get(otherUserId);
        if (!current || new Date(acceptedAt) > new Date(current.acceptedAt))
          byUser.set(otherUserId, { profile, interest: i, acceptedAt });
      });
    return [...byUser.values()].sort(
      (a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt),
    );
  }, [sent, received, profiles, user]);
  const acceptedConnections = useMemo(
    () => acceptedMembers.map((item) => item.profile),
    [acceptedMembers],
  );
  const visibleAcceptedMembers = useMemo(() => {
    const term = acceptedSearch.trim().toLowerCase();
    const now = Date.now();
    return acceptedMembers.filter(({ profile, acceptedAt }) => {
      if (
        term &&
        !String(profile.name || "")
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (
        acceptedFilter === "verified" &&
        !profile.verified &&
        !profile.trustedProfile
      )
        return false;
      if (
        acceptedFilter === "premium" &&
        !profile.premium &&
        !profile.membershipPlanId &&
        !profile.membership
      )
        return false;
      if (
        acceptedFilter === "recent" &&
        now - new Date(acceptedAt).getTime() > 7 * 24 * 60 * 60 * 1000
      )
        return false;
      if (
        acceptedFilter === "active" &&
        now -
          new Date(profile.updatedAt || profile.lastActiveAt || 0).getTime() >
          7 * 24 * 60 * 60 * 1000
      )
        return false;
      return true;
    });
  }, [acceptedMembers, acceptedSearch, acceptedFilter]);
  const conversations = useMemo(() => {
    const map = new Map();
    messages.forEach((m) => {
      const otherId = m.fromUserId === user?.id ? m.toUserId : m.fromUserId;
      const profile =
        m.otherProfile || profiles.find((p) => p.userId === otherId);
      if (!map.has(otherId))
        map.set(otherId, { otherUserId: otherId, profile, messages: [] });
      map.get(otherId).messages.push(m);
    });
    return [...map.values()]
      .map((c) => ({
        ...c,
        last: c.messages[c.messages.length - 1],
        unread: c.messages.filter((m) => m.toUserId === user?.id && !m.read)
          .length,
      }))
      .sort(
        (a, b) =>
          new Date(b.last?.createdAt || 0) - new Date(a.last?.createdAt || 0),
      );
  }, [messages, profiles, user]);

  function acceptedWhen(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Accepted";
    const days = Math.max(
      0,
      Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)),
    );
    if (days === 0) return "Accepted Today";
    if (days === 1) return "Accepted Yesterday";
    return `Accepted ${days} days ago`;
  }
  async function loadProfiles(targetPage = page) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city !== "Any") params.set("city", city);
    if (religion !== "Any") params.set("religion", religion);
    if (maritalStatus !== "Any") params.set("maritalStatus", maritalStatus);
    if (ageMin) params.set("ageMin", ageMin);
    if (ageMax) params.set("ageMax", ageMax);
    if (verified) params.set("verified", "true");
    params.set("sort", sort);
    params.set("page", String(targetPage));
    params.set("limit", "6");
    const d = await api(`/api/profiles?${params}`);
    setProfiles(d.profiles || []);
    setPageInfo(
      d.pagination || { page: 1, pages: 1, total: (d.profiles || []).length },
    );
    setPage(targetPage);
  }
  async function loadPublicPlans() {
    try {
      const [d, c] = await Promise.all([
        api("/api/membership"),
        api("/api/config"),
      ]);
      setPlans(d.plans || []);
      setCoupons(d.coupons || []);
      setPaymentConfig(
        d.paymentConfig || {
          upiId: "",
          qrImage: "/payment-qr.png",
          paymentInstructions: "",
        },
      );
      setSiteConfig((v) => ({ ...v, ...c }));
    } catch {
      setPlans([]);
    }
  }
  async function loadHomepage() {
    try {
      const d = await api("/api/homepage");
      setHomepageData(d);
    } catch {}
  }
  async function trackHomepageVisit() {
    try {
      let id = localStorage.getItem("ms_visitor_id");
      if (!id) {
        id = `msv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("ms_visitor_id", id);
      }
      await api("/api/analytics/visit", {
        method: "POST",
        body: JSON.stringify({ visitorId: id }),
      });
      await loadHomepage();
    } catch {}
  }
  async function loadPrivate() {
    if (!localStorage.getItem("ms_token")) return;
    let session;
    try {
      session = await api("/api/session");
      setUser(session.user);
    } catch {
      localStorage.removeItem("ms_token");
      setUser(null);
      setOwnProfile(null);
      return;
    }

    const requests = await Promise.allSettled([
        api("/api/interests"),
        api("/api/messages"),
        api("/api/notifications"),
        api("/api/membership"),
        isAdminRole(session.user.role)
          ? Promise.resolve({ profile: null })
          : api("/api/profiles?mine=true"),
      ]);
    const [iResult, mResult, nResult, memResult, ownResult] = requests;
    if (iResult.status === "fulfilled") {
      const i = iResult.value;
      setSent(i.interests || []);
      setReceived(i.received || []);
    }
    if (mResult.status === "fulfilled") {
      const m = mResult.value;
      setMessages(m.messages || []);
    }
    if (nResult.status === "fulfilled") {
      const n = nResult.value;
      setNotifications(n.notifications || []);
    }
    if (memResult.status === "fulfilled") {
      const mem = memResult.value;
      setMembership(mem.membership);
      setPlans(mem.plans || []);
      setCoupons(mem.coupons || []);
      setTransactions(mem.transactions || []);
      setPaymentConfig(
        mem.paymentConfig || {
          upiId: "",
          qrImage: "/payment-qr.png",
          paymentInstructions: "",
        },
      );
    }
    if (ownResult.status === "fulfilled") {
      const own = ownResult.value;
      setOwnProfile(own.profile || null);
    } else if (!isAdminRole(session.user.role)) {
      setOwnProfile(null);
      setNotice(
        ownResult.reason?.message ||
          "Unable to load your profile. Please sign out and log in again.",
      );
    }
    if (isAdminRole(session.user.role)) {
      const [adminResult, settingsResult] = await Promise.allSettled([
        api("/api/admin"),
        api("/api/admin/settings"),
      ]);
      if (adminResult.status === "fulfilled") setAdmin(adminResult.value);
      if (settingsResult.status === "fulfilled") setAdminSettings(settingsResult.value);
    } else {
      setAdmin(null);
      setAdminSettings(null);
    }
  }
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("ms_shortlist") || "[]");
    setShortlisted(Array.isArray(saved) ? saved : []);
    loadProfiles(1);
    loadPublicPlans();
    loadHomepage();
    trackHomepageVisit();
    loadPrivate();
  }, []);
  useEffect(() => {
    loadProfiles(1);
  }, [city, verified, religion, maritalStatus, sort]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setOpenMenu("");
  }, [view]);
  useEffect(() => {
    if (view !== "home" || !notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice, view]);
  async function doLogin() {
    try {
      const d = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(login),
      });
      if (d.requiresAdminSecurityAnswer) {
        setAdminSecurityStep({
          required: true,
          question: d.securityQuestion || "Security answer",
        });
        setNotice(d.message);
        return;
      }
      if (d.requiresAdminEmailOtp) {
        setAdminSecurityStep({ required: false, question: "" });
        setLogin((v) => ({ ...v, securityAnswer: "" }));
        setAdminOtp({
          challengeId: d.challengeId,
          emailOtp: "",
          emailMasked: d.emailMasked || "configured email",
          demoEmailOtp: d.demoEmailOtp || "",
        });
        setNotice(d.message);
        setView("adminEmailOtp");
        return;
      }
      setAdminSecurityStep({ required: false, question: "" });
      localStorage.setItem("ms_token", d.token);
      setUser(d.user);
      setNotice(
        d.user.mustChangePassword
          ? "Temporary password accepted. Create a new password to continue."
          : "Login successful.",
      );
      setView(d.user.mustChangePassword ? "forceAdminPassword" : "dashboard");
      await Promise.all([loadProfiles(), loadPrivate()]);
    } catch (e) {
      setNotice(e.message);
    }
  }
  async function verifyAdminEmailOtp() {
    try {
      setAdminOtpBusy(true);
      const d = await api("/api/auth/admin-otp", {
        method: "POST",
        body: JSON.stringify({
          challengeId: adminOtp.challengeId,
          emailOtp: adminOtp.emailOtp,
        }),
      });
      localStorage.setItem("ms_token", d.token);
      setUser(d.user);
      setAdminOtp({
        challengeId: "",
        emailOtp: "",
        emailMasked: "",
        demoEmailOtp: "",
      });
      setNotice(
        d.user.mustChangePassword
          ? "Verification complete. Create your permanent password."
          : d.message,
      );
      setView(d.user.mustChangePassword ? "forceAdminPassword" : "admin");
      await Promise.all([loadProfiles(), loadPrivate()]);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminOtpBusy(false);
    }
  }
  async function requestPasswordReset() {
    try {
      setResetBusy(true);
      const d = await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          action: "request",
          identifier: reset.identifier,
        }),
      });
      setReset((v) => ({ ...v, challengeId: d.challengeId || "" }));
      setResetDemoOtp(d.demoOtp || "");
      setResetStep("verify");
      setNotice(d.message);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setResetBusy(false);
    }
  }
  async function completePasswordReset() {
    try {
      if (reset.password !== reset.confirmPassword)
        throw new Error("Passwords do not match.");
      setResetBusy(true);
      const d = await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          action: "reset",
          challengeId: reset.challengeId,
          otp: reset.otp,
          password: reset.password,
        }),
      });
      setNotice(d.message);
      setReset({
        identifier: "",
        challengeId: "",
        otp: "",
        password: "",
        confirmPassword: "",
      });
      setResetDemoOtp("");
      setResetStep("request");
      setView("login");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setResetBusy(false);
    }
  }
  async function requestRegistrationOtp() {
    try {
      setRegistrationBusy(true);
      const d = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          action: "request-otp",
          firstName: register.firstName,
          lastName: register.lastName,
          email: register.email,
          mobile: register.mobile,
          password: register.password,
          termsAccepted: register.termsAccepted,
        }),
      });
      setOtpChallengeId(d.challengeId);
      setDemoOtp(d.demoOtp || "");
      setRegistrationStep("otp");
      setNotice(d.message);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setRegistrationBusy(false);
    }
  }
  async function verifyRegistrationOtp() {
    try {
      setRegistrationBusy(true);
      const d = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          action: "verify-otp",
          challengeId: otpChallengeId,
          otp,
        }),
      });
      localStorage.setItem("ms_token", d.token);
      setUser(d.user);
      setNotice(d.message);
      setRegistrationStep("details");
      setOtpChallengeId("");
      setOtp("");
      setDemoOtp("");
      setRegister(blank);
      setView("onboarding");
      await Promise.all([loadProfiles(), loadPrivate()]);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setRegistrationBusy(false);
    }
  }
  async function sendInterest(profile) {
    if (!user) {
      setNotice("Please log in to send interest.");
      setView("login");
      return;
    }
    if (sentIds.has(profile.id)) {
      setNotice("Interest already sent.");
      return;
    }
    try {
      setInterestBusy(profile.id);
      const d = await api("/api/interests", {
        method: "POST",
        body: JSON.stringify({ profileId: profile.id }),
      });
      setNotice(d.message || "Interest sent successfully.");
      await loadPrivate();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setInterestBusy("");
    }
  }
  function openProfile(p) {
    setSelected(p);
    setView("profileDetail");
    window.scrollTo(0, 0);
  }
  function toggleShortlist(id) {
    setShortlisted((current) => {
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      localStorage.setItem("ms_shortlist", JSON.stringify(next));
      setNotice(
        current.includes(id)
          ? "Removed from shortlist."
          : "Profile added to shortlist.",
      );
      return next;
    });
  }
  function resetFilters() {
    setQuery("");
    setCity("Any");
    setReligion("Any");
    setMaritalStatus("Any");
    setAgeMin("");
    setAgeMax("");
    setVerified(false);
    setSort("match");
    setTimeout(() => loadProfiles(1), 0);
  }
  function startMessage(p) {
    if (!user) {
      setNotice("Please log in to send a message.");
      setView("login");
      return;
    }
    const connected = acceptedConnections.some((x) => x.id === p.id);
    if (!connected) {
      setNotice("Messaging becomes available after an interest is accepted.");
      setView("interests");
      return;
    }
    setMessageProfile(p);
    setMessageText("");
    setView("compose");
  }
  async function updateInterest(interestId, action) {
    try {
      setCommunicationBusy(interestId);
      const d = await api("/api/interests", {
        method: "PATCH",
        body: JSON.stringify({ interestId, action }),
      });
      setNotice(d.message);
      await loadPrivate();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setCommunicationBusy("");
    }
  }
  async function openConversation(c) {
    setActiveConversation(c.otherUserId);
    setMessageProfile(c.profile);
    setView("messages");
    await api("/api/messages", {
      method: "PATCH",
      body: JSON.stringify({ otherUserId: c.otherUserId }),
    });
    await loadPrivate();
  }
  async function markNotifications(all = false, id = null) {
    await api("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ all, id }),
    });
    await loadPrivate();
  }
  async function sendMessage() {
    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          profileId: messageProfile.id,
          text: messageText,
        }),
      });
      setMessageText("");
      setNotice(`Message sent to ${messageProfile.name}.`);
      await loadPrivate();
      if (isAdminRole(user?.role)) setAdmin(await api("/api/admin"));
      setView("messages");
    } catch (e) {
      setNotice(e.message);
    }
  }
  async function safetyAction(profile, action) {
    if (!user) {
      setView("login");
      setNotice("Please log in to use safety controls.");
      return;
    }
    if (action === "block") {
      if (
        !window.confirm(
          `Block ${profile.name}? You will no longer be able to discover, contact or receive contact from this member.`,
        )
      )
        return;
      try {
        const data = await api("/api/safety", {
          method: "POST",
          body: JSON.stringify({ action: "block", profileId: profile.id }),
        });
        setNotice(data.message);
        setSelected(null);
        setView("profiles");
        await Promise.all([loadProfiles(), loadPrivate()]);
      } catch (e) {
        setNotice(e.message);
      }
      return;
    }
    const category = window.prompt(
      "Report category: fake-profile, harassment, inappropriate-content, fraud, spam, or other",
      "fake-profile",
    );
    if (!category) return;
    const details = window.prompt(
      "Briefly explain the concern (minimum 10 characters):",
      "",
    );
    if (!details) return;
    try {
      const data = await api("/api/safety", {
        method: "POST",
        body: JSON.stringify({
          action: "report",
          profileId: profile.id,
          category,
          details,
        }),
      });
      setNotice(data.message);
    } catch (e) {
      setNotice(e.message);
    }
  }
  function startEdit() {
    if (!myProfile) {
      setNotice("Your profile is still loading. Please refresh once and try again.");
      return;
    }
    const parts = String(myProfile.name || "")
      .trim()
      .split(/\s+/);
    const draft = Object.fromEntries(
      profileKeys.map((k) => [k, myProfile[k] ?? ""]),
    );
    draft.firstName = myProfile.firstName || parts[0] || "";
    draft.lastName = myProfile.lastName || parts.slice(1).join(" ") || "";
    draft.dateOfBirth = String(myProfile.dateOfBirth || "").slice(0, 10);
    setEdit(draft);
    setEditStep(1);
    setView("editProfile");
  }
  async function loadRazorpay() {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }
  async function prepareOnlineQuote(planId) {
    try {
      setOnlinePaymentBusy(true);
      const d = await api("/api/payments/coupon", {
        method: "POST",
        body: JSON.stringify({
          planId,
          couponCode: couponApplied ? activeCoupon()?.code || couponCode : "",
        }),
      });
      setCheckoutQuote(d);
      return d;
    } catch (e) {
      setCheckoutQuote(null);
      setNotice(e.message);
      return null;
    } finally {
      setOnlinePaymentBusy(false);
    }
  }
  async function startOnlinePayment() {
    const planId = paymentForm.planId;
    if (!planId) return;
    try {
      setOnlinePaymentBusy(true);
      const loaded = await loadRazorpay();
      if (!loaded)
        throw new Error(
          "Secure checkout could not be loaded. Please check your connection or use manual UPI.",
        );
      const order = await api("/api/payments/order", {
        method: "POST",
        body: JSON.stringify({
          planId,
          couponCode: couponApplied ? activeCoupon()?.code || couponCode : "",
        }),
      });
      const rz = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "MangalSaath",
        description: `${order.plan.name} Membership`,
        order_id: order.orderId,
        prefill: {
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email || "",
          contact: user.mobile || "",
        },
        theme: { color: "#8f2448" },
        handler: async (response) => {
          try {
            setOnlinePaymentBusy(true);
            const verified = await api("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify(response),
            });
            setNotice(verified.message);
            setCheckoutQuote(null);
            setCouponCode("");
            setCouponApplied(false);
            await loadPrivate();
            setView("membership");
          } catch (e) {
            setNotice(e.message);
          } finally {
            setOnlinePaymentBusy(false);
          }
        },
        modal: {
          ondismiss: () =>
            setNotice(
              "Payment was not completed. No membership change was made.",
            ),
        },
      });
      rz.on("payment.failed", (event) =>
        setNotice(
          event?.error?.description || "Payment failed. Please try again.",
        ),
      );
      rz.open();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setOnlinePaymentBusy(false);
    }
  }
  async function upgradePlan(planId) {
    if (!user) {
      setNotice("Please log in to activate a membership.");
      setView("login");
      return;
    }
    setPaymentForm({ planId, utr: "", screenshot: "" });
    setCheckoutQuote(null);
    setView("payment");
    await prepareOnlineQuote(planId);
  }
  async function submitManualPayment() {
    try {
      if (!/^\d{8,20}$/.test(paymentForm.utr.trim()))
        throw new Error("Enter a valid 8–20 digit UTR/reference number.");
      setMembershipBusy(paymentForm.planId);
      const d = await api("/api/membership", {
        method: "POST",
        body: JSON.stringify({
          planId: paymentForm.planId,
          couponCode: couponApplied
            ? activeCoupon()?.code || couponCode.trim().toUpperCase()
            : "",
          utr: paymentForm.utr.trim(),
          screenshot: paymentForm.screenshot,
        }),
      });
      setNotice(d.message);
      setCouponCode("");
      setCouponApplied(false);
      setPaymentForm({ planId: "", utr: "", screenshot: "" });
      await loadPrivate();
      setView("membership");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setMembershipBusy("");
    }
  }
  function readPaymentScreenshot(file) {
    if (!file) return setPaymentForm((v) => ({ ...v, screenshot: "" }));
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice("Screenshot must be JPG, PNG or WebP.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setNotice("Screenshot must be 1 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setPaymentForm((v) => ({
        ...v,
        screenshot: String(reader.result || ""),
      }));
    reader.readAsDataURL(file);
  }
  function activeCoupon() {
    const code = couponCode.trim().toUpperCase();
    const now = new Date();
    return (
      coupons.find(
        (c) =>
          c.code === code &&
          (!c.startAt || new Date(c.startAt) <= now) &&
          (!c.endAt || new Date(c.endAt) >= now),
      ) || null
    );
  }
  function applyCoupon() {
    const coupon = activeCoupon();
    if (!coupon) {
      setCouponApplied(false);
      setNotice("Invalid, inactive or expired coupon code.");
      return;
    }
    setCouponCode(coupon.code);
    setCouponApplied(true);
    setNotice(`${coupon.code} applied successfully.`);
  }
  async function copyCoupon() {
    const code = featuredCoupon?.code || coupons[0]?.code || "";
    if (!code) {
      setNotice("No active coupon is available right now.");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCouponCode(code);
      setNotice(`Coupon code ${code} copied.`);
    } catch {
      setCouponCode(code);
      setNotice("Coupon code filled in. Select Apply.");
    }
  }

  async function refreshAdminSettings() {
    const data = await api("/api/admin/settings");
    setAdminSettings(data);
    setPlans(data.plans || []);
    setCoupons(data.coupons || []);
    setPaymentConfig((v) => ({
      ...v,
      upiId: data.settings?.upiId || "",
      qrImage: data.settings?.qrImage || "/payment-qr.png",
      paymentInstructions: data.settings?.paymentInstructions || "",
    }));
    setSiteConfig((v) => ({ ...v, ...(data.settings || {}) }));
    return data;
  }
  async function saveAdminSettings(values = adminSettings?.settings) {
    try {
      setAdminSaving(true);
      const d = await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ section: "settings", values }),
      });
      setNotice(d.message);
      await refreshAdminSettings();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminSaving(false);
    }
  }
  async function uploadPaymentQr(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setNotice("Choose a PNG, JPG, JPEG or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice("QR image must be 5 MB or smaller.");
      return;
    }
    try {
      setQrUploading(true);
      const token = localStorage.getItem("ms_token") || "";
      const form = new FormData();
      form.append("qr", file);
      const res = await fetch("/api/admin/qr", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to upload QR image.");
      setNotice(data.message);
      await refreshAdminSettings();
      await loadPublicPlans();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setQrUploading(false);
    }
  }
  async function removePaymentQr() {
    if (!confirm("Remove the current payment QR code?")) return;
    try {
      setQrUploading(true);
      const token = localStorage.getItem("ms_token") || "";
      const res = await fetch("/api/admin/qr", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to remove QR image.");
      setNotice(data.message);
      await refreshAdminSettings();
      await loadPublicPlans();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setQrUploading(false);
    }
  }
  async function savePlan(values = planDraft) {
    try {
      setAdminSaving(true);
      const d = await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ section: "plan", values }),
      });
      setNotice(d.message);
      setPlanDraft(null);
      await refreshAdminSettings();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminSaving(false);
    }
  }
  async function saveCoupon(values = couponDraft) {
    try {
      setAdminSaving(true);
      const d = await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ section: "coupon", values }),
      });
      setNotice(d.message);
      setCouponDraft(null);
      await refreshAdminSettings();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminSaving(false);
    }
  }

  async function saveOffer(values = offerDraft) {
    try {
      setAdminSaving(true);
      const d = await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ section: "offer", values }),
      });
      setNotice(d.message);
      setOfferDraft(null);
      await refreshAdminSettings();
      await loadHomepage();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminSaving(false);
    }
  }
  async function deleteOffer(id) {
    if (!confirm("Delete this homepage offer?")) return;
    try {
      setAdminSaving(true);
      const d = await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ section: "offer-delete", values: { id } }),
      });
      setNotice(d.message);
      await refreshAdminSettings();
      await loadHomepage();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminSaving(false);
    }
  }
  async function deleteCoupon(id) {
    if (!confirm("Delete this coupon?")) return;
    try {
      setAdminSaving(true);
      const d = await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ section: "coupon-delete", values: { id } }),
      });
      setNotice(d.message);
      await refreshAdminSettings();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminSaving(false);
    }
  }
  async function requestVerification() {
    try {
      setVerificationBusy(true);
      const d = await api("/api/verification", {
        method: "POST",
        body: JSON.stringify({
          documentType: verificationDocType,
          documentLast4: verificationDocLast4,
        }),
      });
      setNotice(d.message);
      setVerificationDocLast4("");
      await Promise.all([loadPrivate(), loadProfiles()]);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setVerificationBusy(false);
    }
  }
  async function reviewVerification(profileId, action) {
    try {
      const note = adminReviewNotes[profileId] || "";
      const d = await api("/api/admin", {
        method: "POST",
        body: JSON.stringify({ profileId, action, note }),
      });
      setNotice(d.message);
      setAdmin(await api("/api/admin"));
      await loadProfiles();
    } catch (e) {
      setNotice(e.message);
    }
  }
  async function adminMemberAction(member, action, suppliedNote = null) {
    try {
      if (!member) return;
      const note =
        suppliedNote === null
          ? adminReviewNotes[member.id] || ""
          : suppliedNote;
      if (
        ["reject-mobile", "add-member-note", "suspend-member"].includes(
          action,
        ) &&
        !note.trim()
      ) {
        setNotice("Please add an internal note or reason first.");
        return;
      }
      if (
        [
          "approve",
          "reject",
          "verify-mobile",
          "reject-mobile",
          "suspend-member",
          "activate-member",
        ].includes(action) &&
        !confirm(
          `Confirm ${action.replaceAll("-", " ")} for ${member.firstName} ${member.lastName}?`,
        )
      )
        return;
      setAdminActionBusy(`${member.id}:${action}`);
      const body = {
        action,
        note,
        userId: member.id,
        profileId: member.profile?.id,
      };
      const d = await api("/api/admin", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNotice(d.message);
      setAdminReviewNotes((v) => ({
        ...v,
        [member.id]: "",
        ...(member.profile?.id ? { [member.profile.id]: "" } : {}),
      }));
      const fresh = await api("/api/admin");
      setAdmin(fresh);
      setAdminSelectedMember(
        fresh.users?.find((u) => u.id === member.id) || null,
      );
      await loadProfiles();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminActionBusy("");
    }
  }
  async function reviewPayment(transactionId, action) {
    try {
      const d = await api("/api/admin/payments", {
        method: "POST",
        body: JSON.stringify({ transactionId, action }),
      });
      setNotice(d.message);
      await loadPrivate();
    } catch (e) {
      setNotice(e.message);
    }
  }
  async function reviewReport(reportId, action, note = "") {
    try {
      const d = await api("/api/admin", {
        method: "POST",
        body: JSON.stringify({ reportId, action, note }),
      });
      setNotice(d.message);
      setAdmin(await api("/api/admin"));
    } catch (e) {
      setNotice(e.message);
    }
  }
  async function changeAdminPassword() {
    try {
      if (adminPassword.newPassword !== adminPassword.confirmPassword)
        throw new Error("New passwords do not match.");
      setAdminPasswordBusy(true);
      const d = await api("/api/admin/password", {
        method: "POST",
        body: JSON.stringify(adminPassword),
      });
      setNotice(d.message);
      if (d.user) setUser(d.user);
      setAdminPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      if (view === "forceAdminPassword") setView("admin");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setAdminPasswordBusy(false);
    }
  }
  function validateProfileStep(step = editStep) {
    if (!edit)
      return "Profile data is unavailable. Please reopen the profile editor.";
    if (step === 1) {
      const required = [
        ["firstName", "first name"],
        ["lastName", "surname"],
        ["dateOfBirth", "date of birth"],
        ["placeOfBirth", "place of birth"],
        ["timeOfBirth", "time of birth"],
        ["gender", "gender"],
        ["maritalStatus", "marital status"],
        ["height", "height"],
        ["religion", "religion"],
        ["caste", "caste / community"],
      ];
      const missing = required.find(
        ([key]) =>
          edit[key] === undefined ||
          edit[key] === null ||
          !String(edit[key]).trim(),
      );
      if (missing) return `Please enter ${missing[1]}.`;
      const height = Number(edit.height);
      if (!Number.isInteger(height) || height < 100 || height > 250)
        return "Please enter height between 100 and 250 cm.";
      const dobText = String(edit.dateOfBirth || "");
      const dobMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobText);
      const dob = dobMatch
        ? new Date(
            Date.UTC(
              Number(dobMatch[1]),
              Number(dobMatch[2]) - 1,
              Number(dobMatch[3]),
            ),
          )
        : new Date(NaN);
      if (
        Number.isNaN(dob.getTime()) ||
        dob.toISOString().slice(0, 10) !== dobText
      )
        return "Please select a valid date of birth.";
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(edit.timeOfBirth || "")))
        return "Please enter a valid time of birth.";
      if (String(edit.placeOfBirth || "").trim().length > 180)
        return "Place of birth must be 180 characters or less.";
      const age =
        currentYear -
        dob.getFullYear() -
        (new Date().getMonth() < dob.getMonth() ||
        (new Date().getMonth() === dob.getMonth() &&
          new Date().getDate() < dob.getDate())
          ? 1
          : 0);
      if (age < 18) return "Member must be at least 18 years old.";
    }
    if (step === 2) {
      const required = [
        ["education", "highest education"],
        ["profession", "career / occupation"],
        ["annualCtc", "annual CTC / income"],
        ["brothersMarried", "number of married brothers (enter 0 if none)"],
        ["brothersUnmarried", "number of unmarried brothers (enter 0 if none)"],
        ["sistersMarried", "number of married sisters (enter 0 if none)"],
        ["sistersUnmarried", "number of unmarried sisters (enter 0 if none)"],
        ["country", "country"],
        ["state", "state / region"],
        ["city", "city"],
      ];
      const missing = required.find(
        ([key]) =>
          edit[key] === undefined ||
          edit[key] === null ||
          !String(edit[key]).trim(),
      );
      if (missing) return `Please select ${missing[1]}.`;
      const about = String(edit.about || "").trim();
      if (about.length < 40)
        return "Please write at least 40 characters in About me.";
      if (about.length > 2000)
        return "About me must be 2,000 characters or less.";
      const siblingFields = [
        "brothersMarried",
        "brothersUnmarried",
        "sistersMarried",
        "sistersUnmarried",
      ];
      if (
        siblingFields.some((key) => {
          const value = Number(edit[key]);
          return !Number.isInteger(value) || value < 0 || value > 20;
        })
      )
        return "Please enter each sibling count as a whole number from 0 to 20.";
    }
    if (step === 4) {
      const min = Number(edit.partnerAgeMin) || 18,
        max = Number(edit.partnerAgeMax) || 60;
      if (min < 18 || max > 100 || min > max)
        return "Please select a valid preferred age range.";
    }
    return "";
  }
  function nextProfileStep() {
    const error = validateProfileStep(editStep);
    if (error) {
      setNotice(error);
      return;
    }
    setEditStep(Math.min(4, editStep + 1));
    window.scrollTo(0, 0);
  }
  async function saveProfile() {
    const errors = [1, 2, 4].map(validateProfileStep).filter(Boolean);
    if (errors.length) {
      setNotice(errors[0]);
      return;
    }
    try {
      setProfileSaving(true);
      const d = await api("/api/profiles", {
        method: "PUT",
        body: JSON.stringify(edit),
      });
      setNotice("Profile updated successfully.");
      setSelected(d.profile);
      setOwnProfile(d.profile);
      await Promise.all([loadProfiles(), loadPrivate()]);
      setView("dashboard");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setProfileSaving(false);
    }
  }
  async function addPhotos(files, target) {
    const selectedFiles = [...files].slice(
      0,
      10 - (target.photos || []).length,
    );
    if (!selectedFiles.length) {
      setNotice("You can upload up to 10 photos.");
      return;
    }
    const invalid = selectedFiles.find(
      (f) =>
        !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
        f.size > 2 * 1024 * 1024,
    );
    if (invalid) {
      setNotice("Use JPG, PNG or WEBP images up to 2 MB each.");
      return;
    }
    try {
      setProfilePhotoBusy(true);
      const photos = await Promise.all(
        selectedFiles.map(
          (file, index) =>
            new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () =>
                resolve({
                  id: `ph_${Date.now()}_${index}_${Math.random().toString(36).slice(2)}`,
                  name: file.name,
                  data: r.result,
                });
              r.onerror = () =>
                reject(new Error(`Unable to read ${file.name}.`));
              r.readAsDataURL(file);
            }),
        ),
      );
      if (target === register) {
        setRegister((current) => ({
          ...current,
          photos: [...(current.photos || []), ...photos].slice(0, 10),
        }));
      } else {
        setEdit((current) => {
          const merged = [...(current?.photos || []), ...photos].slice(0, 10);
          return {
            ...current,
            photos: merged,
            primaryPhoto: current?.primaryPhoto || merged[0]?.id || "",
          };
        });
      }
      setNotice(
        `${photos.length} photo${photos.length === 1 ? "" : "s"} added.`,
      );
    } catch (e) {
      setNotice(e.message || "Unable to add photos.");
    } finally {
      setProfilePhotoBusy(false);
    }
  }
  function removePhoto(id, target) {
    const photos = (target.photos || []).filter((p) => p.id !== id);
    const primaryPhoto =
      target.primaryPhoto === id ? photos[0]?.id || "" : target.primaryPhoto;
    target === register
      ? setRegister({ ...register, photos })
      : setEdit({ ...edit, photos, primaryPhoto });
  }
  const photoManager = (target, isEdit = false) => (
    <div className="photoManager">
      <div className="photoHeader">
        <div>
          <h3>
            Photos <span>(optional)</span>
          </h3>
          <p className="muted">
            Add up to 10 photos. JPG, PNG or WEBP; maximum 2 MB each.
          </p>
        </div>
        <label className="uploadBtn">
          {profilePhotoBusy ? "Adding…" : "＋ Add photos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={profilePhotoBusy}
            onChange={(e) => {
              addPhotos(e.target.files, target);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {(target.photos || []).length ? (
        <div className="photoGrid">
          {target.photos.map((ph, index) => (
            <div className="photoTile" key={ph.id}>
              <img src={ph.data} alt={`Profile photo ${index + 1}`} />
              {isEdit && (
                <label className="primaryChoice">
                  <input
                    type="radio"
                    name="primaryPhoto"
                    checked={
                      (target.primaryPhoto || target.photos[0]?.id) === ph.id
                    }
                    onChange={() => setEdit({ ...edit, primaryPhoto: ph.id })}
                  />{" "}
                  Primary
                </label>
              )}
              <button type="button" onClick={() => removePhoto(ph.id, target)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="photoEmpty">
          No photo added. You may continue without photos.
        </div>
      )}
    </div>
  );
  async function logout() {
    try {
      await api("/api/session", { method: "DELETE" });
    } catch {}
    localStorage.removeItem("ms_token");
    setUser(null);
    setOwnProfile(null);
    setSent([]);
    setReceived([]);
    setMessages([]);
    setNotifications([]);
    setAdmin(null);
    setActiveConversation(null);
    setView("home");
    setNotice("Logged out.");
  }
  const regField = (key, label, type = "text", required = true) => (
    <label>
      {label}
      {required && <i>*</i>}
      <input
        type={type}
        value={register[key]}
        onChange={(e) => setRegister({ ...register, [key]: e.target.value })}
      />
    </label>
  );
  const editField = (key, label, type = "text", required = true) => (
    <label>
      {label}
      {required && <i>*</i>}
      <input
        type={type}
        value={edit?.[key] ?? ""}
        onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
      />
    </label>
  );
  const editSelect = (key, label, options, required = true) => (
    <label>
      {label}
      {required && <i>*</i>}
      <select
        value={edit?.[key] ?? ""}
        onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
      >
        <option value="">Select</option>
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </label>
  );
  const dobParts = String(edit?.dateOfBirth || "").split("-");
  const setDobPart = (index, value) => {
    const parts = [dobParts[0] || "", dobParts[1] || "", dobParts[2] || ""];
    parts[index] = value;
    setEdit({
      ...edit,
      dateOfBirth: parts.every(Boolean) ? parts.join("-") : parts.join("-"),
    });
  };
  const regSelect = (key, label, options) => (
    <label>
      {label}
      <i>*</i>
      <select
        value={register[key]}
        onChange={(e) => setRegister({ ...register, [key]: e.target.value })}
      >
        <option value="">Select</option>
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
  const displayHeight = (value) =>
    /^\d+$/.test(String(value || "")) ? `${value} cm` : value || "—";
  const matchScore = (p) => {
    if (!myProfile) return p.score || 75;
    let points = 50,
      total = 50;
    const checks = [
      [myProfile.partnerReligion, p.religion, 15],
      [myProfile.partnerCaste, p.caste, 10],
      [myProfile.partnerLocation, `${p.city} ${p.state} ${p.country}`, 10],
      [myProfile.partnerMaritalStatus, p.maritalStatus, 5],
      [myProfile.partnerEducation, p.education, 5],
      [myProfile.partnerProfession, p.profession, 5],
    ];
    for (const [want, have, value] of checks) {
      if (!want || want === "Open") continue;
      total += value;
      if (
        String(have || "")
          .toLowerCase()
          .includes(String(want).toLowerCase())
      )
        points += value;
    }
    const min = Number(myProfile.partnerAgeMin) || 18,
      max = Number(myProfile.partnerAgeMax) || 60;
    total += 10;
    if (p.age >= min && p.age <= max) points += 10;
    return Math.min(99, Math.round((points / total) * 100));
  };
  const shortlistButton = (p) => (
    <button
      className={`shortlistBtn ${shortlistIds.has(p.id) ? "saved" : ""}`}
      onClick={() => toggleShortlist(p.id)}
    >
      {shortlistIds.has(p.id) ? "★ Shortlisted" : "☆ Shortlist"}
    </button>
  );
  const interestButton = (p) => (
    <button
      className="primary"
      disabled={
        p.userId === user?.id || interestBusy === p.id || sentIds.has(p.id)
      }
      onClick={() => sendInterest(p)}
    >
      {sentIds.has(p.id)
        ? "✓ Interest sent"
        : interestBusy === p.id
          ? "Sending..."
          : user
            ? "♡ Send interest"
            : "Login to connect"}
    </button>
  );
  const adminMembers = (admin?.users || [])
    .filter((m) => !isAdminRole(m.role))
    .filter((m) => {
      const q = adminMemberSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [
          m.id,
          m.firstName,
          m.lastName,
          m.email,
          m.mobile,
          m.city,
          m.profile?.city,
          m.profile?.state,
          m.profile?.religion,
          m.profile?.caste,
          m.membership,
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        );
      const matchesFilter =
        adminMemberFilter === "all" ||
        (adminMemberFilter === "pending" &&
          (m.approvalStatus || "pending") === "pending") ||
        (adminMemberFilter === "mobile" && !m.mobileVerified) ||
        (adminMemberFilter === "approved" &&
          (m.approvalStatus === "approved" || m.verified)) ||
        (adminMemberFilter === "suspended" && m.status === "suspended") ||
        (adminMemberFilter === "rejected" && m.approvalStatus === "rejected");
      return matchesSearch && matchesFilter;
    });
  return (
    <main>
      <header className="topbar premiumTopbar commercialHeader">
        <button
          className="brand"
          onClick={() => {
            setView("home");
            setOpenMenu("");
          }}
          aria-label="Mangalsaath home"
        >
          <span>म</span>
          <b>
            Mangalsaath<small>Meaningful matches. Trusted beginnings.</small>
          </b>
        </button>
        <nav className="mainNav" aria-label="Primary navigation">
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => {
              setView("home");
              setOpenMenu("");
            }}
          >
            Home
          </button>
          <div className="navDropdown">
            <button
              className={view === "profiles" ? "active" : ""}
              aria-expanded={openMenu === "search"}
              onClick={() => setOpenMenu(openMenu === "search" ? "" : "search")}
            >
              Search Matches <span>⌄</span>
            </button>
            {openMenu === "search" && (
              <div className="megaMenu searchMenu">
                <div>
                  <small>DISCOVER</small>
                  <button
                    onClick={() => {
                      resetFilters();
                      setView("profiles");
                      setOpenMenu("");
                    }}
                  >
                    🔎 Search Profiles<span>Browse all suitable members</span>
                  </button>
                  <button
                    onClick={() => {
                      setVerified(true);
                      setView("profiles");
                      setOpenMenu("");
                    }}
                  >
                    ✓ Verified Profiles
                    <span>Profiles with trust indicators</span>
                  </button>
                </div>
                <div>
                  <small>QUICK FILTERS</small>
                  <button
                    onClick={() => {
                      setSort("newest");
                      setView("profiles");
                      setOpenMenu("");
                    }}
                  >
                    ✨ Recently Joined<span>See the newest members first</span>
                  </button>
                  <button
                    onClick={() => {
                      setSort("match");
                      setView("profiles");
                      setOpenMenu("");
                    }}
                  >
                    ♡ Recommended Matches
                    <span>Compatibility-focused results</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          {user && (
            <div className="navDropdown">
              <button
                className={
                  [
                    "dashboard",
                    "interests",
                    "messages",
                    "notifications",
                    "shortlist",
                  ].includes(view)
                    ? "active"
                    : ""
                }
                aria-expanded={openMenu === "matches"}
                onClick={() =>
                  setOpenMenu(openMenu === "matches" ? "" : "matches")
                }
              >
                My Matches <span>⌄</span>
              </button>
              {openMenu === "matches" && (
                <div className="megaMenu compactMenu">
                  <button
                    onClick={() => {
                      setView("dashboard");
                      setOpenMenu("");
                    }}
                  >
                    🏠 Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setInterestTab("received");
                      setView("interests");
                      setOpenMenu("");
                    }}
                  >
                    ❤️ Interests{" "}
                    {pendingReceived.length > 0 && (
                      <b>{pendingReceived.length}</b>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setInterestTab("accepted");
                      setView("interests");
                      setOpenMenu("");
                    }}
                  >
                    🤝 Accepted Members ({acceptedMembers.length})
                  </button>
                  <button
                    onClick={() => {
                      setView("shortlist");
                      setOpenMenu("");
                    }}
                  >
                    🔖 Shortlisted ({shortlisted.length})
                  </button>
                  <button
                    onClick={() => {
                      setView("messages");
                      setOpenMenu("");
                    }}
                  >
                    💬 Messages {unreadMessages > 0 && <b>{unreadMessages}</b>}
                  </button>
                  <button
                    onClick={() => {
                      setView("notifications");
                      setOpenMenu("");
                    }}
                  >
                    🔔 Notifications{" "}
                    {unreadNotifications > 0 && <b>{unreadNotifications}</b>}
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="navDropdown">
            <button
              className={view === "membership" ? "active" : ""}
              aria-expanded={openMenu === "membership"}
              onClick={() =>
                setOpenMenu(openMenu === "membership" ? "" : "membership")
              }
            >
              Membership <span>⌄</span>
            </button>
            {openMenu === "membership" && (
              <div className="megaMenu compactMenu membershipMenu">
                <button
                  onClick={() => {
                    setView("membership");
                    setOpenMenu("");
                  }}
                >
                  💎 Compare Plans
                </button>
                <button
                  onClick={() => {
                    setView("membership-free");
                    setOpenMenu("");
                  }}
                >
                  🌱 Free Membership
                </button>
                <button
                  onClick={() => {
                    setView("membership-premium");
                    setOpenMenu("");
                  }}
                >
                  ✨ Premium Membership
                </button>
                <button
                  onClick={() => {
                    setView("membership-platinum");
                    setOpenMenu("");
                  }}
                >
                  👑 Platinum Membership
                </button>
                <button
                  onClick={() => {
                    setView("membership-benefits");
                    setOpenMenu("");
                  }}
                >
                  ✓ Membership Benefits
                </button>
                <button
                  onClick={() => {
                    setView("membership-faq");
                    setOpenMenu("");
                  }}
                >
                  ❓ Membership FAQ
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="accountActions iconicAccountArea">
          {user ? (
            <>
              <button
                className="iconAction"
                title="Notifications"
                aria-label="Notifications"
                onClick={() => setView("notifications")}
              >
                🔔
                {unreadNotifications > 0 && <span>{unreadNotifications}</span>}
              </button>
              <button
                className="iconAction"
                title="Messages"
                aria-label="Messages"
                onClick={() => setView("messages")}
              >
                💬{unreadMessages > 0 && <span>{unreadMessages}</span>}
              </button>
              <div className="navDropdown accountDropdown">
                <button
                  className="profileMenuButton"
                  onClick={() =>
                    setOpenMenu(openMenu === "account" ? "" : "account")
                  }
                >
                  <i>{(user.firstName || "M")[0]}</i>
                  <span>{user.firstName || "My Profile"}</span>⌄
                </button>
                {openMenu === "account" && (
                  <div className="megaMenu compactMenu accountMenu">
                    <button
                      onClick={() => {
                        setView("dashboard");
                        setOpenMenu("");
                      }}
                    >
                      My Dashboard
                    </button>
                    <button
                      onClick={() => {
                        startEdit();
                        setOpenMenu("");
                      }}
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setView("membership");
                        setOpenMenu("");
                      }}
                    >
                      My Membership
                    </button>
                    {isAdminRole(user.role) && (
                      <button
                        className="adminOnlyLink"
                        onClick={() => {
                          setView("admin");
                          setOpenMenu("");
                        }}
                      >
                        🛡 Admin Console
                      </button>
                    )}
                    <button onClick={logout}>Log out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                className="authIconButton loginButton"
                onClick={() => setView("login")}
              >
                <span>♙</span>
                <b>Log in</b>
              </button>
              <button
                className="authIconButton registerButton"
                onClick={() => setView("register")}
              >
                <span>♡</span>
                <b>Create Free Profile</b>
              </button>
            </>
          )}
        </div>
      </header>
      {notice && (
        <div
          className={`notice ${view === "home" ? "homeToast" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {view === "home" && (
        <>
          <section className="premiumHero compactHomeHero">
            <div className="heroGlow heroGlowOne"></div>
            <div className="heroGlow heroGlowTwo"></div>
            <div className="premiumHeroCopy">
              <span className="trustPill">
                🛡 India-first matrimonial platform
              </span>
              <h1>
                Find a life partner with <em>trust, dignity and tradition.</em>
              </h1>
              <p>
                Create a genuine profile, discover compatible matches and
                connect respectfully.
              </p>
              <div className="actions">
                <button
                  className="primary heroPrimary"
                  onClick={() => setView(user ? "dashboard" : "register")}
                >
                  {user ? "Open my dashboard" : "Create Free Profile"}
                </button>
                <button
                  className="secondary premiumSecondary"
                  onClick={() => setView("profiles")}
                >
                  Search Profiles
                </button>
              </div>
              <div className="premiumTrustRow">
                <span>
                  <b>✓</b> Trusted profiles
                </span>
                <span>
                  <b>✓</b> Privacy first
                </span>
                <span>
                  <b>✓</b> Secure connections
                </span>
              </div>
            </div>
            <div className="heroVisual">
              <div className="heroImageFrame">
                <img
                  src="/hero-indian-couple.jpg"
                  alt="Indian couple in elegant traditional attire"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </section>
          {homepageData.primaryOffer && (
            <section
              className={`dynamicOfferStrip theme-${homepageData.primaryOffer.theme || "rose"}`}
            >
              <div className="offerBadge">
                {homepageData.primaryOffer.badge || "SPECIAL OFFER"}
              </div>
              <div className="dynamicOfferCopy">
                <span>
                  {homepageData.primaryOffer.discountType === "percentage"
                    ? `${homepageData.primaryOffer.discountValue}% OFF`
                    : homepageData.primaryOffer.discountType === "fixed"
                      ? `₹${Number(homepageData.primaryOffer.discountValue).toLocaleString("en-IN")} OFF`
                      : "EXCLUSIVE"}
                </span>
                <div>
                  <h2>{homepageData.primaryOffer.title}</h2>
                  <p>
                    {homepageData.primaryOffer.subtitle}
                    {homepageData.primaryOffer.couponCode && (
                      <>
                        {" "}
                        Use code{" "}
                        <strong>{homepageData.primaryOffer.couponCode}</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                className="primary"
                onClick={() =>
                  setView(
                    homepageData.primaryOffer.buttonTarget || "membership",
                  )
                }
              >
                {homepageData.primaryOffer.buttonText || "View Plans"}
              </button>
            </section>
          )}
          <section className="publicTrustStats">
            <div>
              <span className="eyebrow">LIVE MANGALSAATH COMMUNITY</span>
              <h2>Growing with trust, one meaningful beginning at a time.</h2>
            </div>
            <div className="publicStatGrid">
              <article>
                <b>
                  {Number(
                    homepageData.stats?.totalVisitors || 0,
                  ).toLocaleString("en-IN")}
                  +
                </b>
                <span>Unique Visitors</span>
              </article>
              <article>
                <b>
                  {Number(
                    homepageData.stats?.registeredMembers || 0,
                  ).toLocaleString("en-IN")}
                  +
                </b>
                <span>Registered Members</span>
              </article>
              <article>
                <b>
                  {Number(
                    homepageData.stats?.verifiedProfiles || 0,
                  ).toLocaleString("en-IN")}
                  +
                </b>
                <span>Verified Profiles</span>
              </article>
              <article>
                <b>
                  {Number(
                    homepageData.stats?.premiumMembers || 0,
                  ).toLocaleString("en-IN")}
                  +
                </b>
                <span>Premium Members</span>
              </article>
            </div>
          </section>
          <section className="premiumStats compactStats">
            <article>
              <i>♡</i>
              <div>
                <b>Smart Matches</b>
                <span>Focused discovery</span>
              </div>
            </article>
            <article>
              <i>✓</i>
              <div>
                <b>Trust Workflow</b>
                <span>Verification indicators</span>
              </div>
            </article>
            <article>
              <i>🔒</i>
              <div>
                <b>Privacy Control</b>
                <span>Respectful interaction</span>
              </div>
            </article>
            <article>
              <i>₹</i>
              <div>
                <b>Free to Start</b>
                <span>Affordable upgrades</span>
              </div>
            </article>
          </section>
          <section className="compactJourney">
            <div>
              <span className="eyebrow">SIMPLE & MEANINGFUL</span>
              <h2>Three steps to begin your journey.</h2>
            </div>
            <div className="journeyCards">
              <article>
                <b>01</b>
                <h3>Create</h3>
                <p>Add genuine details and preferences.</p>
              </article>
              <article>
                <b>02</b>
                <h3>Discover</h3>
                <p>Find suitable profiles with focused filters.</p>
              </article>
              <article>
                <b>03</b>
                <h3>Connect</h3>
                <p>Exchange interests before messaging.</p>
              </article>
            </div>
          </section>
        </>
      )}
      {view === "forceAdminPassword" && isAdminRole(user?.role) && (
        <section className="formPage authPage">
          <div className="formCard narrow">
            <span className="eyebrow">FIRST LOGIN SECURITY</span>
            <h2>Create your permanent admin password</h2>
            <p className="muted">
              The temporary password must be changed before the Admin Console
              can be used.
            </p>
            <label>
              Temporary password<i>*</i>
              <input
                type={showAdminPasswords ? "text" : "password"}
                value={adminPassword.currentPassword}
                onChange={(e) =>
                  setAdminPassword((v) => ({
                    ...v,
                    currentPassword: e.target.value,
                  }))
                }
              />
            </label>
            <label>
              New password<i>*</i>
              <input
                type={showAdminPasswords ? "text" : "password"}
                value={adminPassword.newPassword}
                onChange={(e) =>
                  setAdminPassword((v) => ({
                    ...v,
                    newPassword: e.target.value,
                  }))
                }
              />
              <div className="passwordRequirements">
                <b>Password requirements</b>
                <span
                  className={
                    passwordRules(adminPassword.newPassword).length ? "met" : ""
                  }
                >
                  ✓ Minimum 8 characters
                </span>
                <span
                  className={
                    passwordRules(adminPassword.newPassword).uppercase
                      ? "met"
                      : ""
                  }
                >
                  ✓ One uppercase letter
                </span>
                <span
                  className={
                    passwordRules(adminPassword.newPassword).lowercase
                      ? "met"
                      : ""
                  }
                >
                  ✓ One lowercase letter
                </span>
                <span
                  className={
                    passwordRules(adminPassword.newPassword).number ? "met" : ""
                  }
                >
                  ✓ One number
                </span>
                <span
                  className={
                    passwordRules(adminPassword.newPassword).symbol ? "met" : ""
                  }
                >
                  ✓ One special symbol
                </span>
              </div>
            </label>
            <label>
              Confirm new password<i>*</i>
              <input
                type={showAdminPasswords ? "text" : "password"}
                value={adminPassword.confirmPassword}
                onChange={(e) =>
                  setAdminPassword((v) => ({
                    ...v,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </label>
            <label className="showPasswordToggle">
              <input
                type="checkbox"
                checked={showAdminPasswords}
                onChange={(e) => setShowAdminPasswords(e.target.checked)}
              />{" "}
              Show passwords
            </label>
            <button
              className="primary full"
              disabled={
                adminPasswordBusy ||
                !adminPassword.currentPassword ||
                !validPassword(adminPassword.newPassword) ||
                adminPassword.newPassword !== adminPassword.confirmPassword
              }
              onClick={changeAdminPassword}
            >
              {adminPasswordBusy
                ? "Updating…"
                : "Change password & open Admin Console"}
            </button>
          </div>
        </section>
      )}
      {view === "adminEmailOtp" && (
        <section className="formPage authPage">
          <form
            className="formCard narrow"
            onSubmit={(e) => {
              e.preventDefault();
              verifyAdminEmailOtp();
            }}
          >
            <span className="eyebrow">SUPER ADMIN SECURITY</span>
            <h2>Verify your email</h2>
            <p className="muted">
              Password and security answer accepted. Enter the one-time password
              sent to your Super Admin email.
            </p>
            <label>
              Email OTP sent to {adminOtp.emailMasked}
              <i>*</i>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength="6"
                required
                value={adminOtp.emailOtp}
                onChange={(e) =>
                  setAdminOtp((v) => ({
                    ...v,
                    emailOtp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="6-digit email OTP"
              />
            </label>
            {adminOtp.demoEmailOtp && (
              <p className="demoOtp">
                Local test email OTP: <b>{adminOtp.demoEmailOtp}</b>
              </p>
            )}
            <button
              type="submit"
              className="primary full"
              disabled={adminOtpBusy || adminOtp.emailOtp.length !== 6}
            >
              {adminOtpBusy ? "Verifying…" : "Verify email OTP"}
            </button>
            <button
              type="button"
              className="secondary full"
              onClick={() => {
                setAdminOtp({
                  challengeId: "",
                  emailOtp: "",
                  emailMasked: "",
                  demoEmailOtp: "",
                });
                setView("login");
              }}
            >
              Cancel and log in again
            </button>
          </form>
        </section>
      )}
      {view === "login" && (
        <section className="formPage authPage">
          <form
            className="formCard narrow"
            onSubmit={(e) => {
              e.preventDefault();
              doLogin();
            }}
          >
            <span className="eyebrow">MEMBER ACCESS</span>
            <h2>Welcome back</h2>
            <p className="muted">
              Use your registered username, email address or mobile number.
            </p>
            <label>
              Username, email address or mobile number<i>*</i>
              <input
                type="text"
                autoComplete="username"
                required
                readOnly={adminSecurityStep.required}
                value={login.identifier}
                onChange={(e) => {
                  setAdminSecurityStep({ required: false, question: "" });
                  setLogin({
                    ...login,
                    identifier: e.target.value,
                    securityAnswer: "",
                  });
                }}
                placeholder="Username, email or 10-digit mobile"
              />
            </label>
            <label>
              Password<i>*</i>
              <input
                type="password"
                autoComplete="current-password"
                required
                readOnly={adminSecurityStep.required}
                value={login.password}
                onChange={(e) =>
                  setLogin({ ...login, password: e.target.value })
                }
              />
            </label>
            {adminSecurityStep.required && (
              <label>
                {adminSecurityStep.question}
                <i>*</i>
                <input
                  autoFocus
                  required
                  type="password"
                  autoComplete="off"
                  value={login.securityAnswer}
                  onChange={(e) =>
                    setLogin({ ...login, securityAnswer: e.target.value })
                  }
                  placeholder="Super Admin security answer"
                />
              </label>
            )}
            <button
              type="button"
              className="forgotLink"
              onClick={() => {
                setReset((v) => ({ ...v, identifier: login.identifier }));
                setView("forgotPassword");
              }}
            >
              Forgot password?
            </button>
            <button type="submit" className="primary full">
              {adminSecurityStep.required
                ? "Continue Super Admin verification"
                : "Log in securely"}
            </button>
            <p className="authSwitch">
              New to Mangalsaath?{" "}
              <button type="button" onClick={() => setView("register")}>
                Create your profile
              </button>
            </p>
          </form>
        </section>
      )}
      {view === "forgotPassword" && (
        <section className="formPage authPage">
          <div className="formCard narrow resetCard">
            {resetStep === "request" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  requestPasswordReset();
                }}
              >
                <span className="eyebrow">ACCOUNT RECOVERY</span>
                <h2>Reset your password</h2>
                <p className="muted">
                  Enter your registered email address or mobile number.
                </p>
                <label>
                  Username, email address or mobile number<i>*</i>
                  <input
                    required
                    autoComplete="username"
                    value={reset.identifier}
                    onChange={(e) =>
                      setReset({ ...reset, identifier: e.target.value })
                    }
                    placeholder="Username, email or 10-digit mobile"
                  />
                </label>
                <button className="primary full" disabled={resetBusy}>
                  {resetBusy ? "Sending OTP…" : "Send recovery OTP"}
                </button>
                <button
                  type="button"
                  className="textButton"
                  onClick={() => setView("login")}
                >
                  Back to login
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  completePasswordReset();
                }}
              >
                <span className="eyebrow">VERIFY & RESET</span>
                <h2>Create a new password</h2>
                <p className="muted">
                  Enter the OTP sent to your registered contact.
                </p>
                {resetDemoOtp && (
                  <div className="demoOtpNotice">
                    <b>Local testing OTP:</b> <code>{resetDemoOtp}</code>
                    <small>
                      Configure email/SMS delivery before public launch.
                    </small>
                  </div>
                )}
                <label>
                  Recovery OTP<i>*</i>
                  <input
                    className="otpInput"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    value={reset.otp}
                    onChange={(e) =>
                      setReset({
                        ...reset,
                        otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                  />
                </label>
                <label>
                  New password<i>*</i>
                  <input
                    type="password"
                    required
                    minLength="8"
                    maxLength="128"
                    autoComplete="new-password"
                    value={reset.password}
                    onChange={(e) =>
                      setReset({ ...reset, password: e.target.value })
                    }
                  />
                </label>
                <label>
                  Confirm new password<i>*</i>
                  <input
                    type="password"
                    required
                    minLength="8"
                    maxLength="128"
                    autoComplete="new-password"
                    value={reset.confirmPassword}
                    onChange={(e) =>
                      setReset({ ...reset, confirmPassword: e.target.value })
                    }
                  />
                </label>
                <button
                  className="primary full"
                  disabled={
                    resetBusy ||
                    reset.otp.length !== 6 ||
                    reset.password.length < 8
                  }
                >
                  {resetBusy ? "Updating…" : "Reset password"}
                </button>
                <button
                  type="button"
                  className="textButton"
                  onClick={() => {
                    setResetStep("request");
                    setResetDemoOtp("");
                  }}
                >
                  Start again
                </button>
              </form>
            )}
          </div>
        </section>
      )}
      {view === "register" && (
        <section className="formPage authPage">
          <div className="formCard narrow quickRegistration">
            {registrationStep === "details" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!validPassword(register.password)) {
                    setNotice(
                      "Password must contain at least 8 characters, uppercase, lowercase, number and special symbol.",
                    );
                    return;
                  }
                  if (register.password !== register.confirmPassword) {
                    setNotice("Passwords do not match.");
                    return;
                  }
                  requestRegistrationOtp();
                }}
              >
                <span className="eyebrow">QUICK REGISTRATION</span>
                <h2>Create your free account</h2>
                <p className="muted">
                  Register with your name, surname and basic contact details. We
                  will verify your email now. Your mobile number will be
                  verified manually by Admin.
                </p>
                <div className="grid2 registrationNameGrid">
                  <label>
                    Name<i>*</i>
                    <input
                      required
                      maxLength="60"
                      autoComplete="given-name"
                      value={register.firstName}
                      onChange={(e) =>
                        setRegister({ ...register, firstName: e.target.value })
                      }
                      placeholder="First name"
                    />
                  </label>
                  <label>
                    Surname<i>*</i>
                    <input
                      required
                      maxLength="60"
                      autoComplete="family-name"
                      value={register.lastName}
                      onChange={(e) =>
                        setRegister({ ...register, lastName: e.target.value })
                      }
                      placeholder="Surname"
                    />
                  </label>
                </div>
                <label>
                  Email address<i>*</i>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={register.email}
                    onChange={(e) =>
                      setRegister({ ...register, email: e.target.value })
                    }
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  Mobile number<i>*</i>
                  <div className="mobileInput">
                    <span>+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength="10"
                      required
                      autoComplete="tel"
                      value={register.mobile}
                      onChange={(e) =>
                        setRegister({
                          ...register,
                          mobile: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10),
                        })
                      }
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </label>
                <label>
                  Password<i>*</i>
                  <div className="passwordInput">
                    <input
                      type={showPassword ? "text" : "password"}
                      minLength="8"
                      maxLength="128"
                      required
                      autoComplete="new-password"
                      value={register.password}
                      onChange={(e) =>
                        setRegister({ ...register, password: e.target.value })
                      }
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="passwordRequirements">
                    <b>Password requirements</b>
                    <span
                      className={
                        passwordRules(register.password).length ? "met" : ""
                      }
                    >
                      ✓ Minimum 8 characters
                    </span>
                    <span
                      className={
                        passwordRules(register.password).uppercase ? "met" : ""
                      }
                    >
                      ✓ One uppercase letter
                    </span>
                    <span
                      className={
                        passwordRules(register.password).lowercase ? "met" : ""
                      }
                    >
                      ✓ One lowercase letter
                    </span>
                    <span
                      className={
                        passwordRules(register.password).number ? "met" : ""
                      }
                    >
                      ✓ One number
                    </span>
                    <span
                      className={
                        passwordRules(register.password).symbol ? "met" : ""
                      }
                    >
                      ✓ One special symbol
                    </span>
                  </div>
                </label>
                <label>
                  Confirm password<i>*</i>
                  <div className="passwordInput">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      minLength="8"
                      maxLength="128"
                      required
                      autoComplete="new-password"
                      value={register.confirmPassword}
                      onChange={(e) =>
                        setRegister({
                          ...register,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {register.confirmPassword && (
                    <span
                      className={`passwordMatch ${register.password === register.confirmPassword ? "match" : "mismatch"}`}
                    >
                      {register.password === register.confirmPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </span>
                  )}
                </label>
                <label className="consentCheck">
                  <input
                    type="checkbox"
                    required
                    checked={register.termsAccepted}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        termsAccepted: e.target.checked,
                      })
                    }
                  />
                  <span>
                    I am at least 18 years old and agree to the{" "}
                    <button type="button" onClick={() => setView("terms")}>
                      Terms
                    </button>{" "}
                    and{" "}
                    <button type="button" onClick={() => setView("privacy")}>
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
                <button
                  type="submit"
                  className="primary full"
                  disabled={registrationBusy}
                >
                  {registrationBusy ? "Sending OTP…" : "Send email OTP"}
                </button>
                <p className="formSecurityNote">
                  Your email is verified during registration. The Admin will
                  verify your mobile number manually.
                </p>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyRegistrationOtp();
                }}
                className="otpForm"
              >
                <span className="eyebrow">EMAIL VERIFICATION</span>
                <h2>Enter the 6-digit OTP</h2>
                <p className="muted">
                  We sent an OTP to {register.email}. Your account will be
                  created only after successful verification.
                </p>
                {demoOtp && (
                  <div className="demoOtpNotice">
                    <b>Local testing OTP:</b> <code>{demoOtp}</code>
                    <small>
                      Email delivery uses the configured SMTP service.
                    </small>
                  </div>
                )}
                <label>
                  One-time password<i>*</i>
                  <input
                    className="otpInput"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    required
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                  />
                </label>
                <button
                  type="submit"
                  className="primary full"
                  disabled={registrationBusy || otp.length !== 6}
                >
                  {registrationBusy
                    ? "Verifying…"
                    : "Verify OTP & Create Account"}
                </button>
                <div className="otpActions">
                  <button
                    type="button"
                    onClick={() => {
                      setRegistrationStep("details");
                      setOtp("");
                      setDemoOtp("");
                    }}
                  >
                    Change details
                  </button>
                  <button type="button" onClick={requestRegistrationOtp}>
                    Resend OTP
                  </button>
                </div>
              </form>
            )}
            <p className="authSwitch">
              Already registered?{" "}
              <button type="button" onClick={() => setView("login")}>
                Log in
              </button>
            </p>
          </div>
        </section>
      )}
      {view === "onboarding" && (
        <section className="page onboardingPage">
          <div className="welcomePanel">
            <span className="eyebrow">WELCOME TO MANGALSAATH</span>
            <h2>Your mobile number is verified.</h2>
            <p>
              Your account is active. Complete the remaining matrimonial details
              to improve match recommendations and profile visibility.
            </p>
            <div className="onboardingStatus">
              <span>✓ Account registered</span>
              <span>✓ Mobile verified</span>
              <span>○ Email verification pending</span>
              <span>○ Profile completion pending</span>
            </div>
            <div className="actions">
              <button className="primary" onClick={() => startEdit()}>
                Complete My Profile
              </button>
              <button
                className="secondary"
                onClick={() => setView("dashboard")}
              >
                Skip for now
              </button>
            </div>
          </div>
        </section>
      )}
      {view === "profiles" && (
        <section className="page discoveryPage">
          <div className="heading discoveryHeading">
            <div>
              <span className="eyebrow">SMART DISCOVERY</span>
              <h2>Find profiles aligned with your preferences</h2>
              <p>
                Use focused filters, compare compatibility and save promising
                profiles for later.
              </p>
            </div>
            <button className="secondary" onClick={() => setView("shortlist")}>
              ★ View shortlist ({shortlisted.length})
            </button>
          </div>
          <div className="advancedFilters">
            <div className="filterSearch">
              <input
                placeholder="Name, caste, city, education or profession"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadProfiles(1)}
              />
              <button className="primary" onClick={() => loadProfiles(1)}>
                Search profiles
              </button>
            </div>
            <div className="filterGrid">
              <label>
                City
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Religion
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                >
                  {religions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>
                Marital status
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                >
                  <option>Any</option>
                  <option>Never Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                </select>
              </label>
              <label>
                Minimum age
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                />
              </label>
              <label>
                Maximum age
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                />
              </label>
              <label>
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="match">Best match</option>
                  <option value="recent">Recently updated</option>
                  <option value="ageAsc">Age: low to high</option>
                  <option value="ageDesc">Age: high to low</option>
                </select>
              </label>
            </div>
            <div className="filterFooter">
              <label className="check">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />{" "}
                Verified profiles only
              </label>
              <span>{pageInfo.total} profiles found</span>
              <button onClick={resetFilters}>Reset filters</button>
            </div>
          </div>
          <div className="cards discoveryCards">
            {profiles.map((p) => (
              <article key={p.id}>
                <div className="avatar">
                  {p.primaryPhotoData ? (
                    <img src={p.primaryPhotoData} alt={p.name} />
                  ) : (
                    p.initials
                  )}
                </div>
                <div className="cardBody">
                  <div className="titleRow">
                    <h3>{p.name}</h3>
                    {p.verified && <span className="badge">✓ Verified</span>}
                    {p.updatedAt && (
                      <span className="freshBadge">Recently active</span>
                    )}
                  </div>
                  <p>
                    {p.age} yrs • {displayHeight(p.height)} • {p.maritalStatus}
                  </p>
                  <p>
                    {p.religion}
                    {p.caste ? ` • ${p.caste}` : ""} • {p.city}
                  </p>
                  <p>
                    {p.education} • {p.profession}
                  </p>
                  <div className="actions">
                    {shortlistButton(p)}
                    <button
                      className="secondary"
                      onClick={() => openProfile(p)}
                    >
                      View profile
                    </button>
                    <button
                      className="secondary"
                      disabled={p.userId === user?.id}
                      onClick={() => startMessage(p)}
                    >
                      Message
                    </button>
                    {interestButton(p)}
                  </div>
                </div>
                <div className="matchScore">
                  <strong>{p.matchScore || matchScore(p)}%</strong>
                  <span>match</span>
                  {p.matchReasons?.[0] && (
                    <small title={p.matchReasons.join(" • ")}>
                      {p.matchReasons[0]}
                    </small>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!profiles.length && (
            <div className="empty">
              No profiles match these filters. Try widening your preferences.
            </div>
          )}
          <div className="pagination">
            <button
              className="secondary"
              disabled={pageInfo.page <= 1}
              onClick={() => loadProfiles(pageInfo.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {pageInfo.page} of {pageInfo.pages}
            </span>
            <button
              className="secondary"
              disabled={pageInfo.page >= pageInfo.pages}
              onClick={() => loadProfiles(pageInfo.page + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}
      {view === "profileDetail" && selected && (
        <section className="page">
          <button className="back" onClick={() => setView("profiles")}>
            ← Back to profiles
          </button>
          <div className="detail">
            <div className="detailHead">
              <div className="avatar big">
                {selected.primaryPhotoData ? (
                  <img src={selected.primaryPhotoData} alt={selected.name} />
                ) : (
                  selected.initials
                )}
              </div>
              <div>
                <div className="titleRow">
                  <h2>{selected.name}</h2>
                  {selected.verified && (
                    <span className="badge">✓ Verified</span>
                  )}
                </div>
                <p>
                  {selected.age} yrs • {displayHeight(selected.height)} •{" "}
                  {selected.city}, {selected.state}
                </p>
                <p>
                  {selected.education} • {selected.profession}
                </p>
              </div>
            </div>
            <div className="detailGrid">
              <div>
                <h3>Essential details</h3>
                <dl>
                  {selected.placeOfBirth && (
                    <>
                      <dt>Place of birth</dt>
                      <dd>{selected.placeOfBirth}</dd>
                    </>
                  )}
                  {selected.timeOfBirth && (
                    <>
                      <dt>Time of birth</dt>
                      <dd>{selected.timeOfBirth}</dd>
                    </>
                  )}
                  <dt>Marital status</dt>
                  <dd>{selected.maritalStatus}</dd>
                  <dt>Religion</dt>
                  <dd>{selected.religion}</dd>
                  <dt>Caste</dt>
                  <dd>{selected.caste}</dd>
                  {selected.subCaste && (
                    <>
                      <dt>Sub-caste</dt>
                      <dd>{selected.subCaste}</dd>
                    </>
                  )}
                  {selected.gotra && (
                    <>
                      <dt>Gotra</dt>
                      <dd>{selected.gotra}</dd>
                    </>
                  )}
                  <dt>Location</dt>
                  <dd>
                    {selected.city}, {selected.state}, {selected.country}
                  </dd>
                  {selected.annualCtc && (
                    <>
                      <dt>Annual CTC / income</dt>
                      <dd>{selected.annualCtc}</dd>
                    </>
                  )}
                  <dt>Siblings</dt>
                  <dd>
                    Brothers: {selected.brothersMarried || 0} married, {" "}
                    {selected.brothersUnmarried || 0} unmarried
                    <br />
                    Sisters: {selected.sistersMarried || 0} married, {" "}
                    {selected.sistersUnmarried || 0} unmarried
                  </dd>
                </dl>
              </div>
              <div>
                <h3>About</h3>
                <p>{selected.about}</p>
                <h3>Basic partner preference</h3>
                <p>
                  Age {selected.partnerAgeMin}–{selected.partnerAgeMax} •{" "}
                  {selected.partnerReligion || "Open"} •{" "}
                  {selected.partnerCaste || "Open"} •{" "}
                  {selected.partnerLocation || "Open"}
                </p>
                <p className="preferenceExtra">
                  Marital status: {selected.partnerMaritalStatus || "Open"} •
                  Education: {selected.partnerEducation || "Open"} • Profession:{" "}
                  {selected.partnerProfession || "Open"}
                </p>
              </div>
            </div>
            {selected.photos?.length > 1 && (
              <div className="gallery">
                <h3>Photos</h3>
                <div className="galleryGrid">
                  {selected.photos.map((ph, i) => (
                    <img
                      key={ph.id}
                      src={ph.data}
                      alt={`${selected.name} photo ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="actions">
              {interestButton(selected)}
              <button
                className="secondary"
                disabled={selected.userId === user?.id}
                onClick={() => startMessage(selected)}
              >
                💬 Send message
              </button>
              {user && selected.userId !== user.id && (
                <>
                  <button
                    className="secondary"
                    onClick={() => safetyAction(selected, "report")}
                  >
                    ⚑ Report
                  </button>
                  <button
                    className="dangerButton"
                    onClick={() => safetyAction(selected, "block")}
                  >
                    Block member
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}
      {view === "compose" && messageProfile && (
        <section className="formPage">
          <div className="formCard narrow">
            <button
              className="back"
              onClick={() => openProfile(messageProfile)}
            >
              ← Back
            </button>
            <h2>Message {messageProfile.name}</h2>
            <textarea
              rows="7"
              maxLength="1000"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button className="primary full" onClick={sendMessage}>
              Send message
            </button>
          </div>
        </section>
      )}
      {view === "dashboard" && user && (
        <section className="page">
          <div className="welcome">
            <div>
              <small>WELCOME BACK</small>
              <h2>
                {user.firstName} {user.lastName}
              </h2>
              <p>
                {myProfile?.city || "Location pending"} •{" "}
                {myProfile?.profession || "Profession pending"}
              </p>
            </div>
            <div className="communicationDashboard">
              <article>
                <span>Pending interests</span>
                <b>{pendingReceived.length}</b>
                <button
                  onClick={() => {
                    setInterestTab("received");
                    setView("interests");
                  }}
                >
                  Review requests
                </button>
              </article>
              <article>
                <span>Accepted members</span>
                <b>{acceptedMembers.length}</b>
                <button
                  onClick={() => {
                    setInterestTab("accepted");
                    setView("interests");
                  }}
                >
                  View connections
                </button>
              </article>
              <article>
                <span>Unread messages</span>
                <b>{unreadMessages}</b>
                <button onClick={() => setView("messages")}>
                  Open messages
                </button>
              </article>
              <article>
                <span>New alerts</span>
                <b>{unreadNotifications}</b>
                <button onClick={() => setView("notifications")}>
                  View alerts
                </button>
              </article>
            </div>
            <button
              className="membershipChip"
              onClick={() => setView("membership")}
            >
              {membership?.plan?.name || user.membership} member
            </button>
          </div>
          <div className="stats memberStats">
            <article>
              <small>Profile completion</small>
              <b>{completion}%</b>
            </article>
            <article>
              <small>Trust score</small>
              <b>{trustScore}/100</b>
              <span className="scoreLevel">{trustLevel}</span>
            </article>
            <article>
              <small>Interests sent</small>
              <b>{sent.length}</b>
            </article>
            <article>
              <small>Interests received</small>
              <b>{received.length}</b>
            </article>
            <article>
              <small>My messages</small>
              <b>{messages.length}</b>
            </article>
            <article>
              <small>Verification</small>
              <b className="smallValue">
                {myProfile?.verificationStatus === "approved" || user.verified
                  ? "Verified"
                  : myProfile?.verificationStatus === "requested"
                    ? "Under review"
                    : "Not requested"}
              </b>
            </article>
          </div>
          {completion < 100 && (
            <div className="completionPanel">
              <div>
                <b>Complete your profile</b>
                <p>
                  {completionData.missing.slice(0, 4).join(" • ")}
                  {completionData.missing.length > 4
                    ? ` +${completionData.missing.length - 4} more`
                    : ""}
                </p>
              </div>
              <button className="secondary" onClick={startEdit}>
                Complete now
              </button>
            </div>
          )}
          <div className="verificationPanel trustPanel">
            <div>
              <span className="trustIcon">🛡️</span>
              <b>Trust & Verification Center — {trustScore}/100</b>
              <div className="trustMeter">
                <span style={{ width: `${trustScore}%` }} />
              </div>
              <small className="trustBreakdown">
                Profile {completion}% • Mobile{" "}
                {myProfile?.trustChecks?.mobileVerified ? "✓" : "○"} • Email{" "}
                {myProfile?.trustChecks?.emailVerified ? "✓" : "○"} • Photo{" "}
                {myProfile?.trustChecks?.hasApprovedPhoto ? "✓" : "○"} • Admin
                review {myProfile?.trustChecks?.adminReviewed ? "✓" : "○"}
              </small>
              <p>
                {myProfile?.verificationStatus === "requested"
                  ? "Your identity verification is under admin review."
                  : myProfile?.verificationStatus === "needs-information"
                    ? `More information required: ${myProfile?.verificationNote || "Please submit clearer details."}`
                    : myProfile?.verificationStatus === "rejected"
                      ? `Verification rejected: ${myProfile?.verificationNote || "Please review and submit again."}`
                      : myProfile?.verificationStatus === "approved" ||
                          user.verified
                        ? "Mangalsaath Trusted Profile — identity review approved."
                        : "Complete at least 80% of your profile, then submit basic document details for secure admin review."}
              </p>
              {!(
                myProfile?.verificationStatus === "approved" ||
                user.verified ||
                myProfile?.verificationStatus === "requested"
              ) && (
                <div className="verificationForm">
                  <select
                    value={verificationDocType}
                    onChange={(e) => setVerificationDocType(e.target.value)}
                  >
                    <option>Aadhaar</option>
                    <option>Passport</option>
                    <option>Driving Licence</option>
                    <option>Voter ID</option>
                  </select>
                  <input
                    value={verificationDocLast4}
                    onChange={(e) => setVerificationDocLast4(e.target.value)}
                    maxLength={4}
                    placeholder="Last 4 digits"
                  />
                  <small>
                    For this launch build, only the document type and last four
                    digits are stored. Do not upload a full identity document to
                    public profile fields.
                  </small>
                </div>
              )}
            </div>
            <button
              className="secondary"
              disabled={
                verificationBusy ||
                completion < 80 ||
                myProfile?.verificationStatus === "requested" ||
                myProfile?.verificationStatus === "approved" ||
                user.verified ||
                verificationDocLast4.length !== 4
              }
              onClick={requestVerification}
            >
              {verificationBusy
                ? "Submitting..."
                : myProfile?.verificationStatus === "requested"
                  ? "Under review"
                  : myProfile?.verificationStatus === "approved" ||
                      user.verified
                    ? "Trusted profile"
                    : myProfile?.verificationStatus === "needs-information" ||
                        myProfile?.verificationStatus === "rejected"
                      ? "Resubmit verification"
                      : "Submit for verification"}
            </button>
          </div>
          <div className="dashboardActions">
            <button className="primary" onClick={startEdit}>
              ✏️ Edit my profile
            </button>
            <button
              className="secondary"
              onClick={() => myProfile && openProfile(myProfile)}
            >
              View my profile
            </button>
            <button className="secondary" onClick={() => setView("profiles")}>
              Discover matches
            </button>
          </div>
        </section>
      )}
      {view === "editProfile" && edit && (
        <section className="formPage">
          <div className="formCard wide">
            <div className="wizardHead">
              <div>
                <span className="eyebrow">PROFILE WIZARD</span>
                <h2>Complete my profile</h2>
                <p className="muted">
                  Step {editStep} of 4 — accurate details build confidence and
                  improve relevant matches.
                </p>
              </div>
              <div className="wizardProgress">
                <span style={{ width: `${editStep * 25}%` }} />
              </div>
            </div>
            <div className="wizardSteps">
              <button
                className={editStep === 1 ? "active" : ""}
                onClick={() => setEditStep(1)}
              >
                1 Basic
              </button>
              <button
                className={editStep === 2 ? "active" : ""}
                onClick={() => setEditStep(2)}
              >
                2 Career
              </button>
              <button
                className={editStep === 3 ? "active" : ""}
                onClick={() => setEditStep(3)}
              >
                3 Photos
              </button>
              <button
                className={editStep === 4 ? "active" : ""}
                onClick={() => setEditStep(4)}
              >
                4 Preferences
              </button>
            </div>
            {editStep === 1 && (
              <>
                <h3>Basic details</h3>
                <div className="grid2">
                  {editField("firstName", "First name")}
                  {editField("lastName", "Surname")}
                </div>
                <label>
                  Date of birth<i>*</i>
                  <span className="fieldHint">
                    Select your birth date from past years. Members must be at
                    least 18 years old.
                  </span>
                  <div className="dobGrid">
                    <select
                      aria-label="Birth day"
                      value={dobParts[2] || ""}
                      onChange={(e) => setDobPart(2, e.target.value)}
                    >
                      <option value="">Day</option>
                      {dobDays.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Birth month"
                      value={dobParts[1] || ""}
                      onChange={(e) => setDobPart(1, e.target.value)}
                    >
                      <option value="">Month</option>
                      {dobMonths.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Birth year"
                      value={dobParts[0] || ""}
                      onChange={(e) => setDobPart(0, e.target.value)}
                    >
                      <option value="">Year</option>
                      {dobYears.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <div className="grid2">
                  <label>
                    Place of birth<i>*</i>
                    <input
                      type="text"
                      maxLength="180"
                      placeholder="e.g. Panipat, Haryana"
                      value={edit.placeOfBirth || ""}
                      onChange={(e) =>
                        setEdit({ ...edit, placeOfBirth: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Time of birth<i>*</i>
                    <input
                      type="time"
                      step="60"
                      value={edit.timeOfBirth || ""}
                      onChange={(e) =>
                        setEdit({ ...edit, timeOfBirth: e.target.value })
                      }
                    />
                    <span className="fieldHint">
                      Use the exact time from birth records, if available.
                    </span>
                  </label>
                </div>
                <div className="grid2">
                  {editSelect("gender", "Gender", genderOptions)}
                  {editSelect(
                    "maritalStatus",
                    "Marital status",
                    maritalOptions,
                  )}
                  <label>
                    Height (cm)<i>*</i>
                    <input
                      type="number"
                      min="100"
                      max="250"
                      step="1"
                      placeholder="e.g. 170"
                      value={edit.height ?? ""}
                      onChange={(e) =>
                        setEdit({ ...edit, height: e.target.value })
                      }
                    />
                    <span className="fieldHint">
                      Enter height in centimetres.
                    </span>
                  </label>
                </div>
                <h3>Religion & community</h3>
                <div className="grid2">
                  {editSelect("religion", "Religion", religionOptions)}
                  {editSelect("caste", "Caste / Community", casteOptions)}
                  {editField("subCaste", "Sub-caste", "text", false)}
                  {editField("gotra", "Gotra", "text", false)}
                </div>
              </>
            )}
            {editStep === 2 && (
              <>
                <h3>Education, career & location</h3>
                <div className="grid2">
                  {editSelect(
                    "education",
                    "Highest education",
                    educationOptions,
                  )}
                  {editSelect(
                    "profession",
                    "Career / occupation",
                    professionOptions,
                  )}
                  {editField(
                    "annualCtc",
                    "Annual CTC / income (₹)",
                    "text",
                  )}
                  {editSelect("country", "Country", countryOptions)}
                  {editSelect("state", "State / region", stateOptions)}
                  {editSelect("city", "City", cityOptions)}
                </div>
                <h3>Sibling details</h3>
                <p className="fieldHint">
                  Enter the number in each category. Use 0 when there is none.
                </p>
                <div className="grid2">
                  {editField("brothersMarried", "Married brothers", "number")}
                  {editField(
                    "brothersUnmarried",
                    "Unmarried brothers",
                    "number",
                  )}
                  {editField("sistersMarried", "Married sisters", "number")}
                  {editField(
                    "sistersUnmarried",
                    "Unmarried sisters",
                    "number",
                  )}
                </div>
                <label>
                  About me<i>*</i>
                  <textarea
                    rows="5"
                    minLength="40"
                    maxLength="2000"
                    value={edit.about}
                    onChange={(e) =>
                      setEdit({ ...edit, about: e.target.value })
                    }
                  />
                  <span className="fieldHint">
                    {String(edit.about || "").trim().length}/2000 characters •
                    minimum 40
                  </span>
                </label>
              </>
            )}
            {editStep === 3 && <>{photoManager(edit, true)}</>}
            {editStep === 4 && (
              <>
                <h3>Basic partner preference</h3>
                <div className="grid2">
                  <label>
                    Preferred minimum age
                    <select
                      value={edit.partnerAgeMin || ""}
                      onChange={(e) =>
                        setEdit({ ...edit, partnerAgeMin: e.target.value })
                      }
                    >
                      <option value="">No preference</option>
                      {Array.from({ length: 43 }, (_, i) => 18 + i).map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Preferred maximum age
                    <select
                      value={edit.partnerAgeMax || ""}
                      onChange={(e) =>
                        setEdit({ ...edit, partnerAgeMax: e.target.value })
                      }
                    >
                      <option value="">No preference</option>
                      {Array.from({ length: 43 }, (_, i) => 18 + i).map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </label>
                  {editSelect(
                    "partnerReligion",
                    "Preferred religion",
                    ["Open", ...religionOptions],
                    false,
                  )}
                  {editSelect(
                    "partnerCaste",
                    "Preferred caste / community",
                    [
                      "Open",
                      ...casteOptions.filter(
                        (x) => x !== "Open / No preference",
                      ),
                    ],
                    false,
                  )}
                  {editSelect(
                    "partnerLocation",
                    "Preferred location",
                    [
                      "Open",
                      "India",
                      "Delhi NCR",
                      "North India",
                      "South India",
                      "West India",
                      "East India",
                      "Abroad",
                    ],
                    false,
                  )}
                  {editSelect(
                    "partnerMaritalStatus",
                    "Preferred marital status",
                    ["Open", ...maritalOptions],
                    false,
                  )}
                  {editSelect(
                    "partnerEducation",
                    "Preferred education",
                    ["Open", ...educationOptions],
                    false,
                  )}
                  {editSelect(
                    "partnerProfession",
                    "Preferred career",
                    ["Open", ...professionOptions],
                    false,
                  )}
                </div>
              </>
            )}
            <div className="actions wizardActions">
              <button
                className="secondary"
                disabled={editStep === 1}
                onClick={() => setEditStep(Math.max(1, editStep - 1))}
              >
                ← Previous
              </button>
              {editStep < 4 ? (
                <button className="primary" onClick={nextProfileStep}>
                  Next →
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={profileSaving}
                  onClick={saveProfile}
                >
                  {profileSaving ? "Saving…" : "Save profile"}
                </button>
              )}
              <button
                className="secondary"
                onClick={() => setView("dashboard")}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}
      {view === "shortlist" && (
        <section className="page">
          <div className="heading discoveryHeading">
            <div>
              <span className="eyebrow">SAVED PROFILES</span>
              <h2>My shortlist</h2>
              <p>Review the profiles you saved while exploring matches.</p>
            </div>
            <button className="primary" onClick={() => setView("profiles")}>
              Discover more
            </button>
          </div>
          {shortlistedProfiles.length ? (
            <div className="cards discoveryCards">
              {shortlistedProfiles.map((p) => (
                <article key={p.id}>
                  <div className="avatar">
                    {p.primaryPhotoData ? (
                      <img src={p.primaryPhotoData} alt={p.name} />
                    ) : (
                      p.initials
                    )}
                  </div>
                  <div className="cardBody">
                    <div className="titleRow">
                      <h3>{p.name}</h3>
                      {p.verified && <span className="badge">✓ Verified</span>}
                    </div>
                    <p>
                      {p.age} yrs • {displayHeight(p.height)} •{" "}
                      {p.maritalStatus}
                    </p>
                    <p>
                      {p.religion} • {p.city}
                    </p>
                    <p>
                      {p.education} • {p.profession}
                    </p>
                    <div className="actions">
                      {shortlistButton(p)}
                      <button
                        className="secondary"
                        onClick={() => openProfile(p)}
                      >
                        View profile
                      </button>
                      {interestButton(p)}
                    </div>
                  </div>
                  <div className="matchScore">
                    <strong>{p.matchScore || matchScore(p)}%</strong>
                    <span>match</span>
                    {p.matchReasons?.[0] && (
                      <small title={p.matchReasons.join(" • ")}>
                        {p.matchReasons[0]}
                      </small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              Your shortlist is empty. Save promising profiles from Discover.
            </div>
          )}
        </section>
      )}
      {view === "interests" && user && (
        <section className="page communicationPage">
          <div className="heading headingActions">
            <div>
              <span className="eyebrow">CONNECTIONS</span>
              <h2>Interest centre</h2>
              <p>
                Manage sent requests, respond to received interests and connect
                with accepted members.
              </p>
            </div>
            <button className="primary" onClick={() => setView("profiles")}>
              Discover matches
            </button>
          </div>
          <div className="connectionSummary">
            <article>
              <b>{pendingReceived.length}</b>
              <span>Awaiting your response</span>
            </article>
            <article>
              <b>{sent.filter((i) => i.status === "Pending").length}</b>
              <span>Sent and pending</span>
            </article>
            <article>
              <b>{acceptedMembers.length}</b>
              <span>Accepted members</span>
            </article>
          </div>
          <div
            className="interestTabs"
            role="tablist"
            aria-label="Interest sections"
          >
            <button
              className={interestTab === "received" ? "active" : ""}
              onClick={() => setInterestTab("received")}
            >
              Received ({received.length})
            </button>
            <button
              className={interestTab === "sent" ? "active" : ""}
              onClick={() => setInterestTab("sent")}
            >
              Sent ({sent.length})
            </button>
            <button
              className={interestTab === "accepted" ? "active" : ""}
              onClick={() => setInterestTab("accepted")}
            >
              Accepted Members ({acceptedMembers.length})
            </button>
          </div>
          {interestTab === "received" && (
            <div>
              <h3>Received Interests</h3>
              {received.length ? (
                <div className="interestList">
                  {received.map((i) => {
                    const p =
                      i.otherProfile ||
                      profiles.find((x) => x.userId === i.fromUserId);
                    return (
                      <article key={i.id}>
                        <div className="miniAvatar">
                          {p?.primaryPhotoData ? (
                            <img src={p.primaryPhotoData} alt={p.name} />
                          ) : (
                            p?.initials || "MS"
                          )}
                        </div>
                        <div>
                          <b>{p?.name || "New member"}</b>
                          <small>
                            {new Date(i.createdAt).toLocaleString()}
                          </small>
                          <span
                            className={`interestStatus ${i.status.toLowerCase()}`}
                          >
                            {i.status}
                          </span>
                        </div>
                        {i.status === "Pending" ? (
                          <div className="interestActions">
                            <button
                              className="primary"
                              disabled={communicationBusy === i.id}
                              onClick={() => updateInterest(i.id, "accept")}
                            >
                              Accept
                            </button>
                            <button
                              className="secondary"
                              disabled={communicationBusy === i.id}
                              onClick={() => updateInterest(i.id, "reject")}
                            >
                              Decline
                            </button>
                          </div>
                        ) : i.status === "Accepted" && p ? (
                          <button
                            className="secondary"
                            onClick={() => startMessage(p)}
                          >
                            Message
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">No interests received yet.</div>
              )}
            </div>
          )}
          {interestTab === "sent" && (
            <div>
              <h3>Sent Interests</h3>
              {sent.length ? (
                <div className="interestList">
                  {sent.map((i) => {
                    const p =
                      i.otherProfile ||
                      profiles.find((x) => x.id === i.profileId);
                    return (
                      <article key={i.id}>
                        <div className="miniAvatar">
                          {p?.primaryPhotoData ? (
                            <img src={p.primaryPhotoData} alt={p.name} />
                          ) : (
                            p?.initials || "MS"
                          )}
                        </div>
                        <div>
                          <b>{p?.name || "Profile"}</b>
                          <small>
                            {new Date(i.createdAt).toLocaleString()}
                          </small>
                          <span
                            className={`interestStatus ${i.status.toLowerCase()}`}
                          >
                            {i.status}
                          </span>
                        </div>
                        {["Pending", "Accepted"].includes(i.status) ? (
                          <button
                            className="secondary"
                            disabled={communicationBusy === i.id}
                            onClick={() => updateInterest(i.id, "withdraw")}
                          >
                            Withdraw
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">No interests sent yet.</div>
              )}
            </div>
          )}
          {interestTab === "accepted" && (
            <div className="acceptedMembersSection">
              <div className="acceptedHeading">
                <div>
                  <h3>❤️ Accepted Members ({acceptedMembers.length})</h3>
                  <p>
                    Congratulations! These members have accepted your interest.
                    Start a conversation and get to know each other.
                  </p>
                </div>
                <input
                  aria-label="Search accepted members by name"
                  value={acceptedSearch}
                  onChange={(e) => setAcceptedSearch(e.target.value)}
                  placeholder="Search by name"
                />
              </div>
              <div
                className="acceptedFilters"
                aria-label="Accepted member filters"
              >
                <button
                  className={acceptedFilter === "all" ? "active" : ""}
                  onClick={() => setAcceptedFilter("all")}
                >
                  All
                </button>
                <button
                  className={acceptedFilter === "verified" ? "active" : ""}
                  onClick={() => setAcceptedFilter("verified")}
                >
                  Verified
                </button>
                <button
                  className={acceptedFilter === "premium" ? "active" : ""}
                  onClick={() => setAcceptedFilter("premium")}
                >
                  Premium
                </button>
                <button
                  className={acceptedFilter === "recent" ? "active" : ""}
                  onClick={() => setAcceptedFilter("recent")}
                >
                  Recently Accepted
                </button>
                <button
                  className={acceptedFilter === "active" ? "active" : ""}
                  onClick={() => setAcceptedFilter("active")}
                >
                  Recently Active
                </button>
              </div>
              {visibleAcceptedMembers.length ? (
                <div className="acceptedMemberGrid">
                  {visibleAcceptedMembers.map(({ profile, acceptedAt }) => (
                    <article
                      className="acceptedMemberCard"
                      key={profile.userId || profile.id}
                    >
                      <div className="acceptedMemberPhoto">
                        {profile.primaryPhotoData ? (
                          <img
                            src={profile.primaryPhotoData}
                            alt={profile.name}
                          />
                        ) : (
                          <span>{profile.initials || "MS"}</span>
                        )}
                      </div>
                      <div className="acceptedMemberInfo">
                        <div className="acceptedMemberName">
                          <h4>{profile.name || "Member"}</h4>
                          {(profile.verified || profile.trustedProfile) && (
                            <span title="Verified member">✓ Verified</span>
                          )}
                        </div>
                        <p>
                          {profile.age
                            ? `${profile.age} years`
                            : "Age not listed"}{" "}
                          • {profile.city || "Location not listed"}
                        </p>
                        <strong>
                          {profile.profession || "Occupation not listed"}
                        </strong>
                        <small>❤️ {acceptedWhen(acceptedAt)}</small>
                      </div>
                      <div className="acceptedMemberActions">
                        <button
                          className="secondary"
                          onClick={() => openProfile(profile)}
                        >
                          View Profile
                        </button>
                        <button
                          className="primary"
                          onClick={() => startMessage(profile)}
                        >
                          💬 Chat
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty acceptedEmpty">
                  <b>No accepted members found.</b>
                  <p>
                    {acceptedMembers.length
                      ? "Try another search or filter."
                      : "Keep sending interests to connect with suitable matches."}
                  </p>
                  {!acceptedMembers.length && (
                    <button
                      className="primary"
                      onClick={() => setView("profiles")}
                    >
                      Find Matches
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {view === "messages" && user && (
        <section className="page communicationPage">
          <div className="heading">
            <span className="eyebrow">PRIVATE COMMUNICATION</span>
            <h2>Messages</h2>
            <p>
              Chat securely with members after both sides accept the interest.
            </p>
          </div>
          <div className="chatShell">
            <aside className="conversationList">
              <h3>Conversations</h3>
              {conversations.length ? (
                conversations.map((c) => (
                  <button
                    key={c.otherUserId}
                    className={
                      activeConversation === c.otherUserId ? "active" : ""
                    }
                    onClick={() => openConversation(c)}
                  >
                    <span className="miniAvatar">
                      {c.profile?.primaryPhotoData ? (
                        <img
                          src={c.profile.primaryPhotoData}
                          alt={c.profile?.name}
                        />
                      ) : (
                        c.profile?.initials || "MS"
                      )}
                    </span>
                    <span>
                      <b>{c.profile?.name || "Member"}</b>
                      <small>{c.last?.text}</small>
                    </span>
                    {c.unread > 0 && <i>{c.unread}</i>}
                  </button>
                ))
              ) : (
                <div className="empty compact">No conversations yet.</div>
              )}
            </aside>
            <div className="chatPanel">
              {activeConversation ? (
                (() => {
                  const c = conversations.find(
                    (x) => x.otherUserId === activeConversation,
                  );
                  return (
                    <>
                      <div className="chatHeader">
                        <div>
                          <b>{c?.profile?.name || "Member"}</b>
                          <small>
                            {c?.profile?.verified
                              ? "✓ Verified member"
                              : "Connected member"}
                          </small>
                        </div>
                        <button
                          className="secondary"
                          onClick={() => c?.profile && openProfile(c.profile)}
                        >
                          View profile
                        </button>
                      </div>
                      <div className="messageThread">
                        {(c?.messages || []).map((m) => (
                          <div
                            key={m.id}
                            className={`messageBubble ${m.fromUserId === user.id ? "mine" : "theirs"}`}
                          >
                            <p>{m.text}</p>
                            <small>
                              {new Date(m.createdAt).toLocaleString()}{" "}
                              {m.fromUserId === user.id &&
                                (m.read ? " • Read" : " • Sent")}
                            </small>
                          </div>
                        ))}
                      </div>
                      <div className="chatComposer">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Write a respectful message..."
                        />
                        <button
                          className="primary"
                          onClick={async () => {
                            if (!c?.profile) return;
                            setMessageProfile(c.profile);
                            try {
                              await api("/api/messages", {
                                method: "POST",
                                body: JSON.stringify({
                                  profileId: c.profile.id,
                                  text: messageText,
                                }),
                              });
                              setMessageText("");
                              await loadPrivate();
                            } catch (e) {
                              setNotice(e.message);
                            }
                          }}
                        >
                          Send
                        </button>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="chatWelcome">
                  <b>Select a conversation</b>
                  <p>
                    Your accepted connections and messages will appear here.
                  </p>
                  {acceptedConnections.length > 0 && (
                    <div className="quickConnections">
                      {acceptedConnections.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setMessageProfile(p);
                            setMessageText("");
                            setView("compose");
                          }}
                        >
                          Message {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {view === "notifications" && user && (
        <section className="page communicationPage">
          <div className="heading headingActions">
            <div>
              <span className="eyebrow">ACTIVITY</span>
              <h2>Notifications</h2>
              <p>
                Keep track of interests, messages and important account updates.
              </p>
            </div>
            {unreadNotifications > 0 && (
              <button
                className="secondary"
                onClick={() => markNotifications(true)}
              >
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length ? (
            <div className="notificationList">
              {notifications.map((n) => (
                <article key={n.id} className={n.read ? "" : "unread"}>
                  <span className="notificationIcon">
                    {n.type.includes("message")
                      ? "✉"
                      : n.type.includes("interest")
                        ? "♥"
                        : "✓"}
                  </span>
                  <div>
                    <b>{n.title}</b>
                    <p>{n.body}</p>
                    <small>{new Date(n.createdAt).toLocaleString()}</small>
                  </div>
                  {!n.read && (
                    <button onClick={() => markNotifications(false, n.id)}>
                      Mark read
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">No notifications yet.</div>
          )}
        </section>
      )}

      {view === "membership" && (
        <section className="page membershipPage">
          <div className="heading">
            <span className="eyebrow">MEMBERSHIP</span>
            <h2>Choose the access that suits your journey.</h2>
            <p>
              Compare plans and choose the access that fits your journey. Log in
              before activating a paid plan.
            </p>
          </div>
          {featuredOffer && featuredCoupon && (
            <div className="launchOffer">
              <div>
                <span>{featuredOffer.badge || "SPECIAL OFFER"}</span>
                <h3>
                  {featuredOffer.discountType === "percentage"
                    ? `Get an additional ${featuredOffer.discountValue}% off`
                    : featuredOffer.discountType === "fixed"
                      ? `Save ₹${Number(featuredOffer.discountValue).toLocaleString("en-IN")}`
                      : featuredOffer.title}
                </h3>
                <p>
                  {featuredOffer.subtitle || featuredOffer.title} Use coupon
                  code <b>{featuredCoupon.code}</b>
                  {featuredCoupon.applicablePlanIds?.length
                    ? ` on ${featuredCoupon.applicablePlanIds.map((id) => plans.find((p) => p.id === id)?.name || id).join(" or ")} membership.`
                    : "."}
                </p>
              </div>
              <button className="secondary" type="button" onClick={copyCoupon}>
                📋 Copy code
              </button>
            </div>
          )}
          <div className="couponBox">
            <label>
              Coupon code
              <input
                value={couponCode}
                maxLength={20}
                placeholder="Enter coupon code"
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponApplied(false);
                }}
              />
            </label>
            <button className="primary" type="button" onClick={applyCoupon}>
              Apply
            </button>
            {couponApplied && (
              <strong>
                ✓ {activeCoupon()?.code || couponCode} applied successfully
              </strong>
            )}
          </div>
          {user ? (
            <div className="membershipSummary">
              <article>
                <small>Current plan</small>
                <b>{membership?.plan?.name || "Free"}</b>
                <span>
                  {membership?.subscription?.expiresAt
                    ? `Valid until ${new Date(membership.subscription.expiresAt).toLocaleDateString()}`
                    : "No expiry"}
                </span>
              </article>
              <article>
                <small>Interests used</small>
                <b>{membership?.usage?.interests || 0}</b>
                <span>
                  {membership?.plan?.features?.interests === -1
                    ? "Unlimited"
                    : `of ${membership?.plan?.features?.interests || 0}`}
                </span>
              </article>
              <article>
                <small>Messages used</small>
                <b>{membership?.usage?.messages || 0}</b>
                <span>
                  {membership?.plan?.features?.messages === -1
                    ? "Unlimited"
                    : `of ${membership?.plan?.features?.messages || 0}`}
                </span>
              </article>
            </div>
          ) : (
            <div className="membershipGuest">
              <b>Start free. Upgrade when you are ready.</b>
              <span>Create an account to activate a plan and track usage.</span>
              <button className="secondary" onClick={() => setView("register")}>
                Create Free Profile
              </button>
            </div>
          )}
          <div className="planGrid">
            {plans.map((plan) => {
              const coupon = activeCoupon();
              const eligible =
                !coupon?.applicablePlanIds?.length ||
                coupon.applicablePlanIds.includes(plan.id);
              const discount =
                couponApplied && coupon && eligible
                  ? coupon.discountType === "fixed"
                    ? Math.min(plan.price, coupon.discountValue)
                    : Math.round(plan.price * (coupon.discountValue / 100))
                  : 0;
              const finalPrice = plan.price - discount;
              return (
                <article
                  key={plan.id}
                  className={membership?.plan?.id === plan.id ? "current" : ""}
                >
                  <span className="planName">{plan.name}</span>
                  <h3>
                    {plan.price
                      ? `₹${finalPrice.toLocaleString("en-IN")}`
                      : "Free"}
                  </h3>
                  {discount > 0 && (
                    <div className="discountSummary">
                      <span>
                        Original: <s>₹{plan.price.toLocaleString("en-IN")}</s>
                      </span>
                      <span>
                        {coupon?.code || couponCode} discount: −₹
                        {discount.toLocaleString("en-IN")}
                      </span>
                      <b>
                        Final payable: ₹{finalPrice.toLocaleString("en-IN")}
                      </b>
                    </div>
                  )}
                  <small>
                    {plan.durationDays
                      ? `${plan.durationDays} days`
                      : "Ongoing access"}
                  </small>
                  <ul>
                    <li>
                      {plan.features.interests === -1
                        ? "Unlimited"
                        : plan.features.interests}{" "}
                      interests/month
                    </li>
                    <li>
                      {plan.features.messages === -1
                        ? "Unlimited"
                        : plan.features.messages}{" "}
                      messages/month
                    </li>
                    <li>
                      {plan.features.advancedSearch
                        ? "Advanced search included"
                        : "Basic search"}
                    </li>
                    <li>
                      {plan.features.priority
                        ? "Priority profile placement"
                        : "Standard placement"}
                    </li>
                  </ul>
                  {membership?.plan?.id === plan.id ? (
                    <button disabled>Current plan</button>
                  ) : plan.id === "free" ? (
                    <button disabled>Included</button>
                  ) : (
                    <button
                      className="primary"
                      disabled={membershipBusy === plan.id}
                      onClick={() => upgradePlan(plan.id)}
                    >
                      {membershipBusy === plan.id
                        ? "Activating..."
                        : couponApplied
                          ? `Upgrade for ₹${finalPrice.toLocaleString("en-IN")}`
                          : "Pay by UPI"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          {user && (
            <section className="transactionSection">
              <h3>Payment & subscription history</h3>
              {transactions.length ? (
                <div className="transactionTable">
                  {transactions.map((t) => (
                    <article key={t.id}>
                      <span>
                        <b>
                          {plans.find((p) => p.id === t.planId)?.name ||
                            t.planId}
                        </b>
                        <small>
                          {new Date(t.createdAt).toLocaleString()}
                          {t.couponCode ? ` • ${t.couponCode} applied` : ""}
                        </small>
                      </span>
                      <span>₹{Number(t.amount).toLocaleString("en-IN")}</span>
                      <span className={`paymentStatus ${t.status}`}>
                        {t.status}
                      </span>
                      <code>{t.reference}</code>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty">No transactions yet.</div>
              )}
            </section>
          )}
        </section>
      )}

      {view === "payment" &&
        user &&
        (() => {
          const plan = plans.find((p) => p.id === paymentForm.planId);
          const coupon = activeCoupon();
          const eligible =
            !coupon?.applicablePlanIds?.length ||
            coupon.applicablePlanIds.includes(plan?.id);
          const legacyDiscount =
            couponApplied && coupon && eligible
              ? coupon.discountType === "fixed"
                ? Math.min(plan?.price || 0, coupon.discountValue)
                : Math.round((plan?.price || 0) * (coupon.discountValue / 100))
              : 0;
          const onlineAmount = checkoutQuote
            ? checkoutQuote.amountPaise / 100
            : Math.max(0, (plan?.price || 0) - legacyDiscount);
          const saved = checkoutQuote
            ? checkoutQuote.discountPaise / 100
            : legacyDiscount;
          return (
            <section className="page paymentPage">
              <div className="heading">
                <span className="eyebrow">SECURE MEMBERSHIP CHECKOUT</span>
                <h2>Activate {plan?.name || "your"} membership.</h2>
                <p>
                  Pay instantly through Razorpay, or use manual UPI when online
                  checkout is unavailable.
                </p>
              </div>
              <div className="secureCheckoutBanner">
                <span>🔒</span>
                <div>
                  <b>Server-verified activation</b>
                  <p>
                    Your membership is activated only after Razorpay signature
                    verification. MangalSaath never receives your card or UPI
                    PIN.
                  </p>
                </div>
              </div>
              <div className="paymentLayout">
                <article className="paymentQrCard onlineCheckoutCard">
                  <span className="recommendedPayment">RECOMMENDED</span>
                  <h3>Instant online payment</h3>
                  <b className="paymentAmount">
                    ₹{onlineAmount.toLocaleString("en-IN")}
                  </b>
                  {saved > 0 && (
                    <small>
                      {checkoutQuote?.couponCode || coupon?.code || couponCode}{" "}
                      applied • You save ₹{saved.toLocaleString("en-IN")}
                    </small>
                  )}
                  <ul className="checkoutBenefits">
                    <li>UPI, cards and supported payment methods</li>
                    <li>Automatic payment verification</li>
                    <li>Immediate membership activation</li>
                  </ul>
                  <button
                    className="primary checkoutButton"
                    disabled={onlinePaymentBusy || !plan}
                    onClick={startOnlinePayment}
                  >
                    {onlinePaymentBusy
                      ? "Preparing secure checkout…"
                      : "Pay securely & activate now"}
                  </button>
                  <small className="gatewayNote">
                    Processed securely by Razorpay.
                  </small>
                </article>
                <article className="paymentProofCard">
                  <h3>Manual UPI alternative</h3>
                  {paymentConfig.qrImage ? (
                    <img
                      className="compactPaymentQr"
                      src={paymentConfig.qrImage}
                      alt="MangalSaath UPI payment QR code"
                    />
                  ) : null}
                  <code>
                    {paymentConfig.upiId || "UPI ID pending configuration"}
                  </code>
                  <label>
                    UTR / transaction reference
                    <input
                      inputMode="numeric"
                      maxLength={20}
                      value={paymentForm.utr}
                      onChange={(e) =>
                        setPaymentForm((v) => ({
                          ...v,
                          utr: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      placeholder="Enter 8–20 digit UTR"
                    />
                  </label>
                  <label>
                    Payment screenshot (optional)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        readPaymentScreenshot(e.target.files?.[0])
                      }
                    />
                  </label>
                  {paymentForm.screenshot && (
                    <small>✓ Screenshot attached</small>
                  )}
                  <div className="paymentNotice">
                    <b>Manual review</b>
                    <span>
                      {paymentConfig.paymentInstructions ||
                        "After payment, submit the UTR. An administrator will verify it before activation."}
                    </span>
                  </div>
                  <button
                    className="secondary"
                    disabled={
                      membershipBusy === paymentForm.planId || !paymentForm.utr
                    }
                    onClick={submitManualPayment}
                  >
                    {membershipBusy === paymentForm.planId
                      ? "Submitting…"
                      : "Submit manual payment proof"}
                  </button>
                  <button
                    className="textButton"
                    onClick={() => setView("membership")}
                  >
                    Back to plans
                  </button>
                </article>
              </div>
            </section>
          );
        })()}
      {view === "membership-free" && (
        <section className="page infoPage">
          <span className="eyebrow">FREE MEMBERSHIP</span>
          <h2>Start your matrimonial journey without cost.</h2>
          <p className="lead">
            Create a profile, explore suitable members and understand
            Mangalsaath before choosing a paid plan.
          </p>
          <div className="infoGrid">
            <article>
              <h3>What is included</h3>
              <p>
                Profile creation, basic search, a limited monthly interest
                allowance and access to trust indicators.
              </p>
            </article>
            <article>
              <h3>Best for</h3>
              <p>
                New members who want to build a genuine profile and begin
                discovering compatible matches.
              </p>
            </article>
            <article>
              <h3>Upgrade anytime</h3>
              <p>
                Your profile and activity remain available when you move to
                Premium or Platinum.
              </p>
            </article>
          </div>
          <button
            className="primary"
            onClick={() => setView(user ? "dashboard" : "register")}
          >
            {user ? "Open dashboard" : "Create Free Profile"}
          </button>
        </section>
      )}
      {view === "membership-premium" && (
        <section className="page infoPage">
          <span className="eyebrow">PREMIUM MEMBERSHIP</span>
          <h2>More opportunities to connect with suitable matches.</h2>
          <p className="lead">
            Premium is designed for active members who need broader
            communication access and advanced discovery tools.
          </p>
          <div className="infoGrid">
            <article>
              <h3>Expanded communication</h3>
              <p>
                Higher interest and message allowances support more meaningful
                conversations.
              </p>
            </article>
            <article>
              <h3>Advanced search</h3>
              <p>
                Use more focused filters to narrow results around your
                matrimonial preferences.
              </p>
            </article>
            <article>
              <h3>Launch saving</h3>
              <p>
                {featuredCoupon ? (
                  <>
                    Apply coupon <b>{featuredCoupon.code}</b> for the currently
                    available membership discount.
                  </>
                ) : (
                  "Current membership offers will appear here whenever they are active."
                )}
              </p>
            </article>
          </div>
          <button className="primary" onClick={() => setView("membership")}>
            View price and upgrade
          </button>
        </section>
      )}
      {view === "membership-platinum" && (
        <section className="page infoPage">
          <span className="eyebrow">PLATINUM MEMBERSHIP</span>
          <h2>Our highest-access plan for serious search.</h2>
          <p className="lead">
            Platinum provides the strongest communication limits and priority
            benefits available in the launch edition.
          </p>
          <div className="infoGrid">
            <article>
              <h3>Maximum access</h3>
              <p>
                Designed for members who want fewer restrictions while reviewing
                and contacting suitable profiles.
              </p>
            </article>
            <article>
              <h3>Priority placement</h3>
              <p>
                Eligible profiles may receive improved visibility in relevant
                discovery experiences.
              </p>
            </article>
            <article>
              <h3>Transparent duration</h3>
              <p>
                Plan validity and usage are shown clearly in your membership
                dashboard.
              </p>
            </article>
          </div>
          <button className="primary" onClick={() => setView("membership")}>
            Compare with other plans
          </button>
        </section>
      )}
      {view === "membership-benefits" && (
        <section className="page infoPage">
          <span className="eyebrow">MEMBERSHIP BENEFITS</span>
          <h2>Choose access according to your activity—not pressure.</h2>
          <div className="benefitTable">
            <div>
              <b>Feature</b>
              <b>Free</b>
              <b>Premium</b>
              <b>Platinum</b>
            </div>
            <div>
              <span>Profile creation</span>
              <span>Included</span>
              <span>Included</span>
              <span>Included</span>
            </div>
            <div>
              <span>Search access</span>
              <span>Basic</span>
              <span>Advanced</span>
              <span>Advanced</span>
            </div>
            <div>
              <span>Communication allowance</span>
              <span>Limited</span>
              <span>Higher</span>
              <span>Highest</span>
            </div>
            <div>
              <span>Priority placement</span>
              <span>—</span>
              <span>Plan dependent</span>
              <span>Included</span>
            </div>
          </div>
          <button className="primary" onClick={() => setView("membership")}>
            Compare live plans
          </button>
        </section>
      )}
      {view === "membership-faq" && (
        <section className="page infoPage">
          <span className="eyebrow">MEMBERSHIP FAQ</span>
          <h2>Clear answers before you upgrade.</h2>
          <div className="faqList">
            <article>
              <h3>Can I use Mangalsaath for free?</h3>
              <p>
                Yes. Free membership lets you create a profile and begin
                exploring the platform.
              </p>
            </article>
            <article>
              <h3>When does a paid plan start?</h3>
              <p>
                It starts when the plan is successfully activated and its
                validity is recorded in your account.
              </p>
            </article>
            <article>
              <h3>Does payment guarantee marriage or responses?</h3>
              <p>
                No. Membership provides platform access only; compatibility and
                responses depend on individual members.
              </p>
            </article>
            <article>
              <h3>
                {featuredCoupon
                  ? `Can I apply the ${featuredCoupon.code} coupon?`
                  : "How do membership coupons work?"}
              </h3>
              <p>
                Eligible paid plans show the discount before activation when an
                active coupon is accepted.
              </p>
            </article>
          </div>
        </section>
      )}
      {view === "why" && (
        <section className="page infoPage">
          <span className="eyebrow">WHY MANGALSAATH</span>
          <h2>A calmer, clearer way to begin a serious search.</h2>
          <div className="infoGrid">
            <article>
              <h3>Trust-led experience</h3>
              <p>
                Verification status, respectful conduct and transparent profile
                information are central to the platform.
              </p>
            </article>
            <article>
              <h3>India-first design</h3>
              <p>
                Profile fields and preferences reflect the practical needs of
                Indian individuals and families.
              </p>
            </article>
            <article>
              <h3>Privacy awareness</h3>
              <p>
                Members are encouraged to share thoughtfully and independently
                verify important information.
              </p>
            </article>
          </div>
        </section>
      )}
      {view === "help" && (
        <section className="page infoPage">
          <span className="eyebrow">HELP CENTER</span>
          <h2>Quick help for common account questions.</h2>
          <div className="faqList">
            <article>
              <h3>Registration and OTP</h3>
              <p>
                Use an active email address, complete email OTP verification and
                keep your password private.
              </p>
            </article>
            <article>
              <h3>Profile editing</h3>
              <p>
                Open your dashboard and choose Edit my profile to update
                details, preferences and photos.
              </p>
            </article>
            <article>
              <h3>Interests and messages</h3>
              <p>
                Messaging becomes available according to connection status and
                membership limits.
              </p>
            </article>
            <article>
              <h3>Need personal support?</h3>
              <p>
                Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with
                your registered email or mobile number—never your password.
              </p>
            </article>
          </div>
        </section>
      )}
      {view === "safety" && (
        <section className="page infoPage">
          <span className="eyebrow">SAFETY TIPS</span>
          <h2>Connect carefully and verify independently.</h2>
          <div className="safetyList">
            <article>
              <b>Protect financial information</b>
              <p>
                Never send money, banking details, OTPs or passwords to another
                member.
              </p>
            </article>
            <article>
              <b>Verify identity</b>
              <p>
                Use video calls, family involvement and independent document
                checks before major decisions.
              </p>
            </article>
            <article>
              <b>Meet safely</b>
              <p>
                Choose a public place, tell a trusted person and arrange your
                own transport.
              </p>
            </article>
            <article>
              <b>Report concerns</b>
              <p>
                Stop communication and report requests for money, threats,
                impersonation or harassment.
              </p>
            </article>
          </div>
        </section>
      )}
      {view === "report" && (
        <section className="page infoPage">
          <span className="eyebrow">REPORT ABUSE</span>
          <h2>Help us respond to suspicious or harmful behaviour.</h2>
          <p className="lead">
            Send the registered profile name, relevant dates and a clear
            description to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            . Do not send passwords, OTPs or full banking details.
          </p>
          <div className="infoGrid">
            <article>
              <h3>Reportable conduct</h3>
              <p>
                Impersonation, harassment, threats, requests for money, obscene
                content or unauthorized photo use.
              </p>
            </article>
            <article>
              <h3>Preserve evidence</h3>
              <p>
                Keep relevant screenshots and message details without sharing
                them publicly.
              </p>
            </article>
            <article>
              <h3>Urgent danger</h3>
              <p>
                Contact local emergency or law-enforcement services when there
                is an immediate risk.
              </p>
            </article>
          </div>
        </section>
      )}
      {view === "refund" && (
        <section className="page legal">
          <span className="eyebrow">LEGAL</span>
          <h2>Refund Policy</h2>
          <p className="policyDate">Effective: 22 July 2026</p>
          <h3>Digital membership access</h3>
          <p>
            Paid memberships provide time-bound digital access. Once activated
            and used, charges are generally non-refundable except where required
            by applicable law.
          </p>
          <h3>Duplicate or failed transactions</h3>
          <p>
            Contact support if you are charged more than once or payment is
            recorded without plan activation. Verified duplicate or
            failed-payment cases will be reviewed.
          </p>
          <h3>How to request review</h3>
          <p>
            Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with the
            registered account details, payment reference and transaction date.
            Do not include card PINs, passwords or OTPs.
          </p>
          <h3>Processing</h3>
          <p>
            Approved refunds are returned through the original payment method,
            subject to payment-provider processing time.
          </p>
        </section>
      )}

      {view === "admin" && isAdminRole(user?.role) && admin && (
        <AdminConsole
          admin={admin}
          adminSettings={adminSettings}
          busy={Boolean(adminActionBusy || adminSaving || qrUploading)}
          onMemberAction={adminMemberAction}
          onPaymentReview={reviewPayment}
          onReportReview={reviewReport}
          onSavePlan={savePlan}
          onSaveCoupon={saveCoupon}
          onDeleteCoupon={deleteCoupon}
          onSaveOffer={saveOffer}
          onDeleteOffer={deleteOffer}
          onSaveSettings={saveAdminSettings}
          onUploadQr={uploadPaymentQr}
          onRemoveQr={removePaymentQr}
        />
      )}

      {false && view === "admin" && isAdminRole(user?.role) && admin && (
        <section className="page adminVerificationCenter">
          <div className="heading">
            <span className="eyebrow">ADMIN VERIFICATION CENTER</span>
            <h2>Member review and trust operations</h2>
            <p>
              Approve profiles, verify mobile numbers manually, manage
              suspensions and keep an accountable internal record.
            </p>
          </div>
          <div className="adminSprintStats">
            <article>
              <small>Pending approvals</small>
              <b>{admin.stats?.pendingApprovals || 0}</b>
            </article>
            <article>
              <small>Pending mobile checks</small>
              <b>{admin.stats?.pendingMobileVerification || 0}</b>
            </article>
            <article>
              <small>Approved members</small>
              <b>{admin.stats?.approvedMembers || 0}</b>
            </article>
            <article>
              <small>New today</small>
              <b>{admin.stats?.newToday || 0}</b>
            </article>
            <article>
              <small>Suspended</small>
              <b>{admin.stats?.suspendedMembers || 0}</b>
            </article>
            <article>
              <small>Premium</small>
              <b>{admin.stats?.premiumMembers || 0}</b>
            </article>
          </div>
          <div className="adminMemberToolbar">
            <input
              value={adminMemberSearch}
              onChange={(e) => setAdminMemberSearch(e.target.value)}
              placeholder="Search member ID, name, email, mobile, city, religion or caste"
            />
            <div>
              {[
                ["pending", "Pending"],
                ["mobile", "Mobile pending"],
                ["approved", "Approved"],
                ["suspended", "Suspended"],
                ["rejected", "Rejected"],
                ["all", "All"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={adminMemberFilter === key ? "active" : ""}
                  onClick={() => setAdminMemberFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="adminMemberWorkspace">
            <div className="adminMemberList">
              {adminMembers.length ? (
                adminMembers.map((member) => (
                  <article
                    key={member.id}
                    className={
                      adminSelectedMember?.id === member.id ? "selected" : ""
                    }
                    onClick={() => setAdminSelectedMember(member)}
                  >
                    <div>
                      <b>
                        {member.firstName} {member.lastName}
                      </b>
                      <small>{member.id}</small>
                    </div>
                    <p>
                      {member.email}
                      <br />
                      {member.mobile}
                    </p>
                    <div className="adminStatusPills">
                      <span className={member.emailVerified ? "ok" : "wait"}>
                        Email {member.emailVerified ? "verified" : "pending"}
                      </span>
                      <span className={member.mobileVerified ? "ok" : "wait"}>
                        Mobile{" "}
                        {member.mobileVerified
                          ? "verified"
                          : member.mobileVerificationStatus || "pending"}
                      </span>
                      <span
                        className={
                          member.approvalStatus === "approved" ||
                          member.verified
                            ? "ok"
                            : member.approvalStatus === "rejected"
                              ? "bad"
                              : "wait"
                        }
                      >
                        {member.approvalStatus || "pending"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="adminEmpty">
                  No members match the current filters.
                </div>
              )}
            </div>
            <div className="adminMemberReview">
              {adminSelectedMember ? (
                (() => {
                  const m = adminSelectedMember,
                    p = m.profile || {};
                  const busy = adminActionBusy.startsWith(`${m.id}:`);
                  return (
                    <>
                      <div className="adminReviewHead">
                        <div>
                          <small>MEMBER REVIEW</small>
                          <h3>
                            {m.firstName} {m.lastName}
                          </h3>
                          <p>
                            {m.id} • Joined{" "}
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleDateString(
                                  "en-IN",
                                )
                              : "—"}
                          </p>
                        </div>
                        <button onClick={() => setAdminSelectedMember(null)}>
                          Close
                        </button>
                      </div>
                      <div className="adminReviewGrid">
                        <article>
                          <b>Contact</b>
                          <p>
                            {m.email}
                            <br />
                            {m.mobile}
                          </p>
                        </article>
                        <article>
                          <b>Profile</b>
                          <p>
                            {p.gender || "—"} • {p.age || "Age pending"}
                            <br />
                            {p.city || m.city || "City pending"},{" "}
                            {p.state || ""}
                          </p>
                        </article>
                        <article>
                          <b>Community</b>
                          <p>
                            {p.religion || "—"} • {p.caste || "—"}
                            <br />
                            {p.gotra || "Gotra pending"}
                          </p>
                        </article>
                        <article>
                          <b>Membership</b>
                          <p>
                            {m.membership || "Free"}
                            <br />
                            {m.status || "active"}
                          </p>
                        </article>
                      </div>
                      <label className="adminInternalNote">
                        Internal note / action reason
                        <textarea
                          maxLength="500"
                          value={adminReviewNotes[m.id] || ""}
                          onChange={(e) =>
                            setAdminReviewNotes((v) => ({
                              ...v,
                              [m.id]: e.target.value,
                            }))
                          }
                          placeholder="Visible only to administrators"
                        />
                      </label>
                      <div className="adminActionGroups">
                        <div>
                          <b>Mobile verification</b>
                          <button
                            disabled={busy || m.mobileVerified}
                            onClick={() =>
                              adminMemberAction(m, "verify-mobile")
                            }
                          >
                            ✓ Mark manually verified
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              adminMemberAction(m, "reject-mobile")
                            }
                          >
                            Reject mobile
                          </button>
                        </div>
                        <div>
                          <b>Profile approval</b>
                          <button
                            disabled={
                              busy || !p.id || m.approvalStatus === "approved"
                            }
                            onClick={() => adminMemberAction(m, "approve")}
                          >
                            ✓ Approve member
                          </button>
                          <button
                            disabled={busy || !p.id}
                            onClick={() => adminMemberAction(m, "reject")}
                          >
                            Reject member
                          </button>
                        </div>
                        <div>
                          <b>Account control</b>
                          {m.status === "suspended" ? (
                            <button
                              disabled={busy}
                              onClick={() =>
                                adminMemberAction(m, "activate-member")
                              }
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              disabled={busy}
                              onClick={() =>
                                adminMemberAction(m, "suspend-member")
                              }
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            disabled={
                              busy || !(adminReviewNotes[m.id] || "").trim()
                            }
                            onClick={() =>
                              adminMemberAction(m, "add-member-note")
                            }
                          >
                            Save internal note
                          </button>
                        </div>
                      </div>
                      <div className="adminTimeline">
                        <h4>Recent timeline</h4>
                        {(admin.activities || [])
                          .filter(
                            (a) => a.entityId === m.id || a.entityId === p.id,
                          )
                          .slice(0, 8)
                          .map((a) => (
                            <p key={a.id}>
                              <b>{a.action.replaceAll(".", " ")}</b>
                              <span>
                                {new Date(a.createdAt).toLocaleString("en-IN")}
                              </span>
                              {a.note && <small>{a.note}</small>}
                            </p>
                          ))}
                        {!(admin.activities || []).some(
                          (a) => a.entityId === m.id || a.entityId === p.id,
                        ) && <p>No recorded admin actions yet.</p>}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="adminEmpty adminSelectPrompt">
                  Select a member to open the complete review workspace.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      <footer
        className={`siteFooter premiumFooter ${view === "home" ? "homeFooter" : ""}`}
      >
        <div className="footerBrand">
          <button className="brand" onClick={() => setView("home")}>
            <span>म</span>
            <b>Mangalsaath</b>
          </button>
          <p>
            Meaningful matches, trusted beginnings and respectful connections
            for Indian families.
          </p>
          <div className="footerTrust">
            ✓ Privacy conscious &nbsp; ✓ Secure platform &nbsp; ✓
            Trusted-profile workflow
          </div>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <a href={`tel:${siteConfig.supportMobile}`}>
            {siteConfig.supportMobile}
          </a>
          <small>
            {siteConfig.businessName} • {siteConfig.businessAddress} • GSTIN:{" "}
            {siteConfig.gstin}
          </small>
        </div>
        <div className="footerLinks fourColumnFooter">
          <div>
            <b>Explore</b>
            <button onClick={() => setView("profiles")}>Search matches</button>
            <button onClick={() => setView("membership")}>Compare plans</button>
            <button onClick={() => setView("register")}>
              Create free profile
            </button>
            <button onClick={() => setView("login")}>Member login</button>
          </div>
          <div>
            <b>Company</b>
            <button onClick={() => setView("about")}>About us</button>
            <button onClick={() => setView("why")}>Why Mangalsaath</button>
            <button onClick={() => setView("contact")}>Contact us</button>
          </div>
          <div>
            <b>Support</b>
            <button onClick={() => setView("help")}>Help center</button>
            <button onClick={() => setView("safety")}>Safety tips</button>
            <button onClick={() => setView("report")}>Report abuse</button>
          </div>
          <div>
            <b>Legal</b>
            <button onClick={() => setView("privacy")}>Privacy policy</button>
            <button onClick={() => setView("terms")}>Terms & conditions</button>
            <button onClick={() => setView("refund")}>Refund policy</button>
          </div>
        </div>
        <div className="footerBottom">
          <span>
            {siteConfig.footerCopyright ||
              "© 2026 Mangalsaath. All rights reserved."}
          </span>
          <span>India-first • Privacy conscious • Founding member launch</span>
        </div>
      </footer>
    </main>
  );
}
