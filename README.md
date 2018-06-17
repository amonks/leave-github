How To Run Your Own Git Server
==============================

Since Microsoft bought GitHub (henceforth, MSGHub), I think I should back up
all my git repos. I will take notes in this document. If you also want to back
up all your git repos, you might find this useful.

## The approach

As my new corporate master, I choose Amazon. This is fine.

I'll spin up a tiny EC2 instance and install git on it. I will then clone all
of my repositories (and organizations' repositories) into this server for
safe-keeping.

I will also install gitolite. Gitolite is kinda like MSGHub, in that you can
have multiple users who can make their own repositories (or not, as you
declare). It is unlike MSGHub in that there is no web interface, no wikis, no
issues, no pages. It's _just_ authorization for regular git.

### Other things that do more

If you want those other things, I've heard Gogs is nice. There's a fork called
Gitea which I hear you're supposed to use instead now. I tried GitLab a while
back, and it did a lot of things and I liked that very much, but it was a pain
in the ass to set up and then it ran slowly and consumed many resources. Ymmv.

### Why I am not using one of those things

The way I'm thinking about it, leaving MSGHub is _really annoying_ because of
all the disparate things I rely on it for. It is the homepage for my open
source projects. It is the free web hosting for many other projects. It is the
source of identity used by package managers. It is the canonical list of my
public keys. I even use their OAuth to log into other websites.

I think if I try to switch to another provider with the same set of services, I
will be nearly as locked-in as now. No good.

Let's make a thing that only does git.

## Ok let's do it

### Make a new aws account

I will make a new AWS account for this in my organization, so that two weeks
from now when I'm back on MSGHub, I can easily delete all the resources at
once. Plus, free tier!

1. [add an account to the
   organization](https://console.aws.amazon.com/organizations/home?region=us-east-1#/accounts),
   and file it under 'Personal'. Note: the "move" button shows up above your
   accounts _after you select one_. Not in the sidebar where one might expect.

2. **do a forgot-password on the new account** this is how you make a password. It's
   [documented](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html). 
   - **password requirement:** prepend `1A-`
   - _remember to add it to your 1password_

### Make an EC2

From the [ec2 page](https://us-west-2.console.aws.amazon.com/ec2/v2/home?region=us-west-2#Home:),
click "Launch Instance".

I picked "Amazon Linux 2 LTS Candidate 2 AMI (HVM), SSD Volume Type" because it
was near the top of the list, nothing matters, and 2 is one better than 1.
"SSD" sounds expensive, but it also says "free tier elligible", so, #whatever.

> I ran out of space later on when cloning all my repos so I looked this up:
> the free tier comes with 30GB of EBS storage, and you SSDs and magnets are
> both included.
> 
> [source](https://aws.amazon.com/free/)

Then, pick the free one.

Hit "launch". In the dropdown, pick "Create a new key pair". I gave mine the
name "git@monks.co aws key pair", and it saved as `gitmonkscoawskeypair.pem.txt`.

_remember to add it to your 1password_

```bash
$ mv ~/Downloads/gitmonkscoawskeypair.pem.txt ~/.ssh/gitmonkscoawskeypair.pem
$ chmod 400 ~/.ssh/gitmonkscoawskeypair.pem
```

### Connect to the ec2

From the [instances dashboard](https://us-west-2.console.aws.amazon.com/ec2/v2/home?region=us-west-2#Instances:),
select your instance, and click "Connect".

I get an example command like 

```
$ ssh -i "git@monks.co aws key pair.pem" ec2-user@ec2-34-220-122-222.us-west-2.compute.amazonaws.com
```

Funny how they mangled the key file name.

Note the user (`ec2-user`) and host
(`ec2-34-220-122-222.us-west-2.compute.amazonaws.com`).

_remember to add them to 1password_.

Add to `~/.ssh/config`:

```
Host git-root
	HostName ec2-34-220-122-222.us-west-2.compute.amazonaws.com
	User ec2-user
	IdentityFile ~/.ssh/gitmonkscoawskeypair.pem
```

```bash
$ ssh git-root
The authenticity of host 'ec2-34-220-122-222.us-west-2.compute.amazonaws.com (34.220.122.222)' can't be established.
ECDSA key fingerprint is SHA256:N0Ls4jtk8TiTDGlb8HxFy8bCU3AeIg4TCZ7zhaPqbUg.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added 'ec2-34-220-122-222.us-west-2.compute.amazonaws.com,34.220.122.222' (ECDSA) to the list of known hosts.

       __|  __|_  )
       _|  (     /   Amazon Linux 2 AMI
      ___|\___|___|

https://aws.amazon.com/amazon-linux-2/
10 package(s) needed for security, out of 29 available
Run "sudo yum update" to apply all updates.
```

Rad!

### Do the updates

Never used a `yum` distro before. Neat!

```bash
$ sudo yum update
```

### Install gitolite

I googled `gitolite yum` and found [this lovely article](https://www.unixmen.com/install-gitolite-centos-7/). Let's do all the stuff it says.

```bash
$ sudo yum install autoconf git
$ sudo adduser git
$ sudo passwd git
```

TBH I'm not sure setting a password for this account is a good idea.
I'll only be sshing into it for git, using a public key. Whatever.
Use a nice long random password.

On your own computer, copy your public key:

```bash
$ cat ~/.ssh/id_rsa.pub | pbcopy
```

Back on the server, paste it into a file:

```bash
$ sudo su git
$ cd
$ vim amonks.pub
(i, <paste>, <backspace>, escape, colon, w, q, enter)

# your bash profile adds ~/bin to your path
$ source .bash_profile
$ git clone git://github.com/sitaramc/gitolite
$ mkdir ~/bin
$ gitolite/install -ln ~/bin
$ gitolite setup -pk amonks.pub
```

### Connect to git

On your own computer, add to `~/.ssh/config`:

```
Host git
	HostName ec2-34-220-122-222.us-west-2.compute.amazonaws.com
	User git
```

Then, from your own computer, run `ssh git info`:

```bash
$ ssh git info
hello amonks, this is git@ip-172-31-29-117 running gitolite3 v3.6.7-22-
g4191404 on git 2.14.4

 R W    gitolite-admin
 R W    testing
```

You just issued the `info` command to gitolite, which lists all of the
repositories you have access to. Editing the `gitolite-admin` repo is
how you set up gitolite. The `testing` repo is created automatically.

You could also do `ssh git@hostname.whatever info`, but you just set
up an alias for this. Neat!

```
$ git clone git:gitolite-admin
$ cd gitolite-admin
```

This is what the gitolite-admin repo looks like:

```
.
├── conf
│   └── gitolite.conf
└── keydir
    └── amonks.pub

2 directories, 2 files
```

### Clone all your repos

From the [github tokens page](https://github.com/settings/tokens),
make a new token.

_don't forget to add it to 1password_

Also, on your git server, make an SSH key for the `git` user with
`ssh-keygen`, and add it to github.

I made a node script for the cloning part. It's in this repo. On the
server, go back to the ec2-user user, and run:

```bash
$ curl --silent --location https://rpm.nodesource.com/setup_10.x | sudo bash -
$ sudo yum install -y nodejs

$ sudo su git
$ cd
$ git clone git@github.com:amonks/leave-github.git
$ cd leave-github
$ npm install

# edit the token in clone.js to be the token you made on github

$ node clone.js
```

^ this might take a long time. Mine started at 01:16:45, and ended at 1:33.

I blacklisted the github org EpicGames in the script, because I know I'm in the
org but I don't want a copy of the Unreal Engine.

If, like me, you have a ton of shit in github but you aren't really sure how
much "a ton" is, you might want to run `df -h` periodically in another shell,
while the clone is happening, to make sure your drive doesn't get full.

### Add all your repos to gitolite

I'm following the instructions on [gitolite's website](http://gitolite.com/gitolite/basic-admin/#appendix-1-bringing-existing-repos-into-gitolite).

```bash
gitolite setup
```

Now, we have to add the repositories to `conf/gitolite.conf`.

On your own computer, navigate back to your clone of gitolite-admin, and edit
conf/gitolite.conf.

Mine looks like this:

```
repo gitolite-admin
    RW+     =   amonks

repo testing
    RW+     =   @all

repo CREATOR/[a-z0-9A-Z-]+
    RW+     =   amonks
    C       =   CREATOR
    RW+     =   CREATOR

repo CREATOR/public/[a-z0-9A-Z-]+
    C       =   CREATOR
    RW+     =   CREATOR
    R       =   @all
```

=======
server, run:

```bash
$ sudo su git
$ curl --silent --location https://rpm.nodesource.com/setup_10.x | sudo bash -
$ git clone git@github.com:amonks/leave-github.git
$ cd leave-github
$ npm install
$ node clone.js
```

^ this might take a long time.
>>>>>>> initial commit
