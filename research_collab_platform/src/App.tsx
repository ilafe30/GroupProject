import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Explore from "./pages/Explore";
import AMS from "./pages/AMS";
import Ranking from "./pages/Ranking";
import MyPosts from "./pages/MyPosts";
import Applications from "./pages/Applications";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import About from "./pages/About";
import CreatePost from "./pages/CreatePost";
import ApplyPost from "./pages/CreatePost";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import PublicPersonProfile from "./pages/PublicPersonProfile";
import MyPostsForApplications from "./pages/MyPostsForApplications";
import PostApplications from "./pages/PostApplications";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/ams" element={<AMS />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/search" element={<Search />} />
          <Route path="/about" element={<About />} />
          <Route path="/submit" element={<CreatePost />} />
          <Route path="/posts/:id/apply" element={<ApplyPost />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/people/:role/:id" element={<PublicPersonProfile />} />
          <Route path="/create-project" element={<CreateProject />} />
          <Route path="/applications/my-posts" element={<MyPostsForApplications />} />
          <Route path="/applications/post/:postId" element={<PostApplications />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

