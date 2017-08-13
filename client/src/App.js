import React, { Component } from 'react';
import Image from 'react-lazy-image';
import TimeAgo from 'react-timeago';
import finStrings from 'react-timeago/lib/language-strings/fi';
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';
import loadingSpinner from './loading.svg';

const formatter = buildFormatter(finStrings);

function ImageCard(props) {
  var title;
  if(props.timeago) {
    title = <TimeAgo date={props.pic.date} formatter={formatter} />;
  } else {
    const date = new Date(props.pic.date);
    title = (
      <div>
        {getNaturalDate(date)}
        {" klo "}
        {getNaturalTime(date)}
      </div>
    );
  }
  
  return(
    <div className="imagecard">
      <Image source={props.pic.path}
        defaultSource={loadingSpinner}
        type={'jpg'}
        className="img-cam"
        alt={props.pic.date}
        offset={300} />
      <div className="imagecard-title">
        {props.timeago ? '#' + (props.num + 1) + ' - ' : ''}
        {title}
      </div>
    </div>
  );
}



function ImagesContainer(props) {
  var elements = [];
  var picDate;
  var day;
  var dayChanged = false;
  var hour;

  // Render day and hour changes between images
  props.images.forEach(function(pic, index) {
    dayChanged = false;
    picDate = new Date(pic.date);

    if(picDate.getDate() !== day) {
      dayChanged = true;
      day = picDate.getDate();
      
      // New divider
      elements.push(
        <div key={'divider-day ' + picDate} className="images-divider">
          {getNaturalDate(picDate)}
        </div>
      );
    }

    if(picDate.getHours() !== hour || dayChanged) {
      hour = picDate.getHours();

      // New divider
      elements.push(
        <div key={'divider-hour ' + picDate} className="images-divider images-divider-minor">
          {'klo ' + (hour.toString().length === 1 ? '0' + hour.toString() : hour.toString())}
        </div>
      );
    }

    elements.push(
      <ImageCard key={pic._id}
        pic={pic}
        timeago={props.timeago}
        num={index} />
    );
  });

  return(
    <div className="images-container">
      {elements}
    </div>
  )
}



class Day extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: this.props.open
    }

    this.openClose = this.openClose.bind(this);
  }

  componentWillReceiveProps() {
    this.setState({
      open: false
    });
  }

  openClose() {
    this.setState((prevState) => ({
      open: !prevState.open
    }));
  }

  render() {
    var imgs = [];

    if(this.state.open) {
      this.props.pics.forEach(function(pic) {
        imgs.push(pic);
      });
    }

    return(
      <div>
        <h4 className="calendar-header" onClick={this.openClose}>
          {this.props.day}.{this.props.month + 1}.
          <small>{' ' + this.props.pics.length + ' kuvaa'}</small>
        </h4>
        <ImagesContainer images={imgs} timeago={false} />
      </div>
    );
  }
}



class Month extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: this.props.open
    }

    this.openClose = this.openClose.bind(this);
  }

  componentWillReceiveProps() {
    this.setState({
      open: true
    });
  }

  openClose() {
    this.setState((prevState) => ({
      open: !prevState.open
    }));
  }

  render() {
    const month = getMonthNameFI(this.props.month);
    const days = this.props.days;
    return(
      <div>
        <h3 className="calendar-header" onClick={this.openClose}>{month}</h3>
        {this.state.open ?
          days.map(day =>
            <Day key={day.day}
              day={day.day}
              month={this.props.month}
              pics={day.pics}
              open={false} />
          )
          : ""
        }
      </div>
    );
  }
}



class Year extends Component {
  constructor(props) {
    super(props);
    this.state = {
    }
  }

  render() {
    return (
      <div>
        <h2>{this.props.year}</h2>
        {this.props.months.map(month =>
          <Month key={month.month}
            month={month.month}
            days={month.days}
            open={true} />
        )}
      </div>
    );
  }
}



class ImageCalendar extends Component {
  constructor(props){
    super(props);
    this.state = {
      calendar: []
    }
  }

  componentDidMount() {
    this.fetchData(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.fetchData(nextProps);
  }

  fetchData(propsUsed) {
    // Fetch data
    const token = localStorage.getItem('jwt');
    fetch('api/images/organized?order=descending&camera=' + propsUsed.camera, {headers: {'x-access-token': token}})
      .then(response => response.json())
      .then(responseJson => this.setState({ calendar: responseJson }));
  }

  render(){
    return(
      <div>
        {this.state.calendar.map(year =>
            <Year key={year.year}
              year={year.year}
              months={year.months} />
          )}
      </div>
    );
  }
}



class NewImages extends Component {
  constructor(props){
    super(props);
    this.state = {
      images: []
    }
  }

  componentDidMount() {
    this.fetchData(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.fetchData(nextProps);
  }  

  fetchData(propsUsed, loadMore) {
    const token = localStorage.getItem('jwt');

    // Fetch data
    if(!loadMore) {
      fetch('api/images/new?n=20&camera=' + propsUsed.camera, {headers: {'x-access-token': token}})
        .then(response => response.json())
        .then(responseJson => this.setState({ images: responseJson }));

    } else {
      var before = '&before=' + this.state.images[this.state.images.length - 1]._id;
      fetch('api/images/new?n=20&camera=' + propsUsed.camera + before, {headers: {'x-access-token': token}})
        .then(response => response.json())
        .then(responseJson => this.setState(prevState => ({ images: prevState.images.concat(responseJson) })));
    }
  }

  loadMoreImages() {
    this.fetchData(this.props, true);
  }

  render() {
    return(
      <div>
        <ImagesContainer images={this.state.images} timeago={true} />
        <div id="morebutton-wrapper">
            <button id="morebutton" onClick={this.loadMoreImages.bind(this)}>Lisää</button>
        </div>
      </div>
    );
  }
}



class LoginForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      message: ''
    }

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      [name]: value,
      message: ''
    });
  }

  handleSubmit(event) {
    event.preventDefault();

    const username = this.state.username;
    const password = this.state.password;
    
    fetch('api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    })
      .then(response => response.json())
      .then(responseJson => this.handleLoginResponse(responseJson));
  }

  handleLoginResponse(response) {
    if(response.success) {
      // Save token to local storage
      localStorage.setItem('jwt', response.token);

      // Inform parent of successful login
      this.props.onSuccess();

    } else {
      this.setState({
        message: response.message
      });
    }
  }

  render() {
    return (
      <div className="login-view">
        <div className="login-container">
          <form className="form-signin">
            <h2 className="form-signin-heading">Kirjaudu sisään</h2>
            <p id="login-message">{this.state.message !== '' ? this.state.message : <br />}</p>
            <label htmlFor="username" className="sr-only">Käyttäjänimi:</label>
            <input 
              className="form-control"
              id="username"
              type="text"
              value={this.state.usernameField}
              onChange={this.handleInputChange}
              name="username"
              placeholder="käyttäjänimi" />
            <label htmlFor="password" className="sr-only">Salasana:</label>
            <input
              className="form-control"
              id="password"
              type="password"
              value={this.state.passwordField}
              onChange={this.handleInputChange}
              name="password"
              placeholder="salasana" /><br />        
            <input className="btn btn-lg btn-primary btn-block" type="submit" value="Kirjaudu" onClick={this.handleSubmit} />
          </form>
        </div>
      </div>
    );
  }
}



class Navbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cameraDropdownOpen: false,
      categoryDropdownOpen: false
    }

    this.openCameraDropdown = this.openCameraDropdown.bind(this);
    this.openCategoryDropdown = this.openCategoryDropdown.bind(this);
  }

  componentWillReceiveProps() {
    this.setState({
      cameraDropdownOpen: false,
      categoryDropdownOpen: false
    });
  }

  openCameraDropdown() {
    this.setState((prevState) => ({
      cameraDropdownOpen: !prevState.cameraDropdownOpen,
      categoryDropdownOpen: false
    }));
  }

  openCategoryDropdown() {
    this.setState((prevState) => ({
      cameraDropdownOpen: false,
      categoryDropdownOpen: !prevState.categoryDropdownOpen
    }));
  }

  render() {
    var dropdown;

    if(this.state.cameraDropdownOpen) {
      dropdown = (
        <div className="navbar-dropdown unselectable" id="navbar-dropdown-camera">
          <ul>
            {this.props.cameras.map(camera =>
              <li key={camera} onClick={() => this.props.cameraChanged(camera)}>{camera}</li>
            )}
          </ul>
        </div>
      );

    } else if (this.state.categoryDropdownOpen) {
      dropdown = (
        <div className="navbar-dropdown unselectable" id="navbar-dropdown-category">
          <ul>
            {this.props.categories.map(category =>
              <li key={category} onClick={() => this.props.categoryChanged(category)}>{category}</li>
            )}
          </ul>
        </div>
      );
    }

    return(
      <div>
        <div id="navbar" className="unselectable">

          <div className="navbar-part" id="navbar-part-left" onClick={this.openCameraDropdown}>
              <span className="glyphicon glyphicon-camera" aria-hidden="true" id="navbar-icon-camera"></span>
          </div>

          <div className="navbar-part" id="navbar-part-middle">
            <div id="navbar-toprow">
              {this.props.currentCam}
            </div>
            <div id="navbar-bottomrow" onClick={this.openCategoryDropdown}>
              {this.props.currentCat}
              <span className="glyphicon glyphicon-triangle-bottom" aria-hidden="true" id="navbar-gallery-arrow"></span>
            </div>
          </div>

          <div className="navbar-part" id="navbar-part-right" onClick={this.props.logout}>
            <span className="glyphicon glyphicon-log-out" aria-hidden="true" id="navbar-log-out"></span>
          </div>

        </div>

        {dropdown}
      </div>
    )
  }
}



function Footer(props) {
  return(
    <div id="footer">
    </div>
  );
}



class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loggedIn: false,
      cameras: [],
      currentCam: 'Kaikki',
      currentCat: 'Uusimmat'
    }
  }

  categories = ['Uusimmat', 'Kalenteri'];

  fetchData() {
    const token = localStorage.getItem('jwt');
    fetch('api/cameras', {headers: {'x-access-token': token}})
    .then(response => response.json())
    .then(responseJson => {
      if(!tokenOk(responseJson)) {this.logOut(); return;}
      var cameras = [];
      cameras.push('Kaikki');
      responseJson.forEach(function(camera) {
        cameras.push(camera.name);
      });

      this.setState({
        cameras: cameras,
        currentCam: cameras[0]
      });
    });
  }

  componentWillMount() {
    // Check if we have a token
    if(localStorage.getItem('jwt') != null) {
      this.loginSuccess();
    }
  }

  handleCameraChange(newCam) {
    this.setState({
      currentCam: newCam
    });

    document.body.scrollTop = 0;
  }

  handleCategoryChange(newCat) {
    this.setState({
      currentCat: newCat
    });

    document.body.scrollTop = 0;
  }

  loginSuccess() {
    this.setState({
      loggedIn: true
    });
    this.fetchData();    
  }

  logOut() {
    localStorage.removeItem('jwt');
    this.setState({
      loggedIn: false
    });
  }

  render() {
    var content;
    var bodyContent;
    if(this.state.loggedIn) {
      if(this.state.currentCat === 'Uusimmat') {
        bodyContent = <NewImages camera={this.state.currentCam === 'Kaikki' ? '' : this.state.currentCam} images={this.state.newest} />;        
          
      } else if(this.state.currentCat === 'Kalenteri') {
        bodyContent = <ImageCalendar camera={this.state.currentCam === 'Kaikki' ? '' : this.state.currentCam} calendar={this.state.calendar} />;
      }

      content = (
        <div>
          <div id="app-content">
            <Navbar 
              cameras={this.state.cameras}
              currentCam={this.state.currentCam}
              categories={this.categories}
              currentCat={this.state.currentCat}
              cameraChanged={this.handleCameraChange.bind(this)}
              categoryChanged={this.handleCategoryChange.bind(this)}
              logout={this.logOut.bind(this)} />

            {bodyContent}
          </div>
          <Footer />
        </div>
      );
    } else {
      content = <LoginForm onSuccess={this.loginSuccess.bind(this)} />;
    }

    return (
      <div>
        <img src={loadingSpinner} className="preload" alt="" /> {/* Preload loading animation */}
        {content}
      </div>
    );
  }
}



export default App;



function tokenOk(response) {
  if(response.success === false && response.message === 'Failed to authenticate token.') {
    return false;
  }
  return true;
}



function getMonthNameFI(month) {
  var monthName;
  switch(month) {
    case 0:
      monthName = 'tammi';
      break;
    case 1:
      monthName = 'helmi';
      break;
    case 2:
      monthName = 'maalis';
      break;
    case 3:
      monthName = 'huhti';
      break;
    case 4:
      monthName = 'touko';
      break;
    case 5:
      monthName = 'kesä';
      break;
    case 6:
      monthName = 'heinä';
      break;
    case 7:
      monthName = 'elo';
      break;
    case 8:
      monthName = 'syys';
      break;
    case 9:
      monthName = 'loka';
      break;
    case 10:
      monthName = 'marras';
      break;
    case 11:
      monthName = 'joulu';
      break;
    default:
      monthName = '';
  }

  return monthName + 'kuu';
}

function getNaturalDate(date) {
  return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear();
}

function getNaturalTime(date) {
  var hours = date.getHours().toString();
  var minutes = date.getMinutes().toString();
  var seconds = date.getSeconds().toString();

  if(hours.length === 1){
    hours = '0' + hours;
  }
  if(minutes.length === 1){
    minutes = '0' + minutes;
  }
  if(seconds.length === 1){
    seconds = '0' + seconds;
  }

  return hours + '.' + minutes + '.' + seconds;
}
