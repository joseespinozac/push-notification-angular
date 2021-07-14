import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { map, pluck } from 'rxjs/operators'
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public denied = Notification.permission === "denied";
  public subscribed = false;
  public notifications: Notification[] = [];

  constructor(private _http: HttpClient, private swPush: SwPush){
    this.swPush.messages.subscribe(
      (notification: any) => {
        let not = new Notification(notification.title, {
          icon: notification.icon,
          image: notification.image,
          body: notification.body,
          timestamp: notification.timestamp
        })
        this.notifications.push(not);
      }
    )
    this.firstUpdated();
  }

  firstUpdated() {
    this.swPush.subscription.subscribe(
      current => {
        this.subscribed = current ? true : false;
      }
    )
  }

  async subscribe() {
    const notificationPermission = await Notification.requestPermission();
    if(notificationPermission === "granted") {
      const publicKey: string = await this._http.get("http://192.168.2.55:8080/keys/public").pipe(
        pluck('key'),
        map(key => key.toString())
      ).toPromise();
      console.log(publicKey);
      let subscription = JSON.parse(localStorage.getItem("subscription"));
      if(!subscription) {
        this.proceedToSub(publicKey)
      }


    } else {
      this.denied = true;
    }
  }

  proceedToSub(publicKey: string) {
    console.log("Proceder a suscribir con la siguiente llave: ", publicKey);

    this.swPush.requestSubscription({
      serverPublicKey: publicKey
    }).then(
      subscription => {
        this.subscribed = true;
        localStorage.setItem("subscription", JSON.stringify(subscription))
        this._http.post("http://192.168.2.55:8080/subscription", subscription.toJSON()).subscribe();
      }
    )
  }

  async unsubscribe() {
    let subscription = JSON.parse(localStorage.getItem("subscription"));

    this.swPush.unsubscribe().then(
      response => {
        console.log("Desuscribirse");
        console.log(subscription);
        this._http.post("http://192.168.2.55:8080/subscription/unsubscribe", {value: subscription.endpoint}).subscribe();
        this.subscribed = false;
        localStorage.removeItem("subscription")
      }
    );
  }


}
